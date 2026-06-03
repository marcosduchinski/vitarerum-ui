import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { IDENTITY_SERVICE, IdentityService } from '@core/auth/identity.service';
import { GroupName } from '@core/auth/models/group-name.enum';
import { IdentitySession } from '@core/auth/models/identity-session.model';

import { ProjectApiServiceMock } from '../../projects/mocks/project-api.service.mock';
import { ProposalApiServiceMock } from './proposal-api.service.mock';

const sessionState = signal<IdentitySession | null>({
  accessToken: 'mock-token',
  user: {
    id: 'u-bob',
    email: 'bob@collections.example.com',
    displayName: 'Bob Santos',
  },
  group: 'COLLECTIONS_MANAGEMENT',
  availableGroups: ['COLLECTIONS_MANAGEMENT'],
});

const identityStub: IdentityService = {
  session: sessionState.asReadonly(),
  isAuthenticated: signal(true).asReadonly(),
  signIn: (email: string) => {
    const session = sessionState();
    if (session) sessionState.set({ ...session, user: { ...session.user, email } });
  },
  signOut: () => sessionState.set(null),
  getAccessToken: () => sessionState()?.accessToken ?? null,
  setGroup: (group: GroupName) => {
    const session = sessionState();
    if (session) sessionState.set({ ...session, group });
  },
  updateAvailableGroups: (groups: readonly GroupName[]) => {
    const session = sessionState();
    if (session) sessionState.set({ ...session, availableGroups: [...groups] });
  },
};

describe('ProposalApiServiceMock', () => {
  let service: ProposalApiServiceMock;

  beforeEach(() => {
    sessionState.set({
      accessToken: 'mock-token',
      user: {
        id: 'u-bob',
        email: 'bob@collections.example.com',
        displayName: 'Bob Santos',
      },
      group: 'COLLECTIONS_MANAGEMENT',
      availableGroups: ['COLLECTIONS_MANAGEMENT'],
    });

    TestBed.configureTestingModule({
      providers: [
        ProposalApiServiceMock,
        ProjectApiServiceMock,
        {
          provide: IDENTITY_SERVICE,
          useValue: identityStub,
        },
      ],
    });

    service = TestBed.inject(ProposalApiServiceMock);
  });

  it('returns seeded proposals on list', async () => {
    const page = await firstValueFrom(service.listProposals());
    expect(page.totalElements).toBeGreaterThan(0);
    expect(page.content.length).toBeGreaterThan(0);
  });

  it('returns a proposal detail by id', async () => {
    const p = await firstValueFrom(service.getProposal('prop-1'));
    expect(p.id).toBe('prop-1');
    expect(p.status).toBe('SUBMITTED');
  });

  it('starts seeded proposal conversations with the collection-use request', async () => {
    const [proposal, conversation] = await Promise.all([
      firstValueFrom(service.getProposal('prop-1')),
      firstValueFrom(service.getConversation('prop-1')),
    ]);

    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0]).toMatchObject({
      id: 'msg-prop-1-initial',
      sender: 'alice@ext.example.com',
      recipient: 'collections@vitarerum.example.com',
      subject: 'Collection use request: VR-2026-001',
    });
    expect(conversation.messages[0].body).toContain('zoology specimen catalogues');
    expect(conversation.messages[0].attachments).toEqual([
      {
        documentId: 'doc-prop-1-research-outline',
        fileName: 'zoology-research-outline.pdf',
        fileReference: 'mock-proposal-file/zoology-research-outline.pdf',
      },
      {
        documentId: 'doc-prop-1-catalogue-list',
        fileName: 'atlantic-forest-catalogue-list.xlsx',
        fileReference: 'mock-proposal-file/atlantic-forest-catalogue-list.xlsx',
      },
    ]);
    expect(proposal.documents.map((document) => document.id)).toEqual(
      expect.arrayContaining(['doc-prop-1-research-outline', 'doc-prop-1-catalogue-list']),
    );
  });

  it('includes incoming requester attachments for seeded exhibition proposals', async () => {
    const [proposal, conversation] = await Promise.all([
      firstValueFrom(service.getProposal('prop-4')),
      firstValueFrom(service.getConversation('prop-4')),
    ]);

    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0]).toMatchObject({
      id: 'msg-prop-4-initial',
      sender: 'alice@ext.example.com',
      subject: 'Collection use request: VR-2026-004',
    });
    expect(conversation.messages[0].attachments).toEqual([
      {
        documentId: 'doc-prop-4-exhibition-brief',
        fileName: 'laboratory-instruments-exhibition-brief.pdf',
        fileReference: 'mock-proposal-file/laboratory-instruments-exhibition-brief.pdf',
      },
      {
        documentId: 'doc-prop-4-object-list',
        fileName: 'laboratory-instruments-object-list.csv',
        fileReference: 'mock-proposal-file/laboratory-instruments-object-list.csv',
      },
    ]);
    expect(proposal.documents.map((document) => document.id)).toEqual(
      expect.arrayContaining(['doc-prop-4-exhibition-brief', 'doc-prop-4-object-list']),
    );
  });

  it('transitions to APPROVED and updates event log', async () => {
    const result = await firstValueFrom(service.approveProposal('prop-3', { note: 'Looks good' }));
    expect(result.proposal.status).toBe('APPROVED');
    expect(result.collectionUseProject.status).toBe('ACCEPTED');

    const events = await firstValueFrom(service.listEvents('prop-3'));
    const last = events.content[events.content.length - 1];
    expect(last.type).toBe('APPROVED');
  });

  it('moves the approved proposal project into pending projects', async () => {
    const projectService = TestBed.inject(ProjectApiServiceMock);

    const before = await firstValueFrom(projectService.listProjects({ status: 'ACCEPTED' }));
    expect(before.content.find((project) => project.id === 'proj-3')).toBeUndefined();

    await firstValueFrom(service.approveProposal('prop-3', { note: 'Looks good' }));

    const pending = await firstValueFrom(projectService.listProjects({ status: 'ACCEPTED' }));
    const project = pending.content.find((item) => item.id === 'proj-3');

    expect(project).toBeDefined();
    expect(project).toMatchObject({
      id: 'proj-3',
      status: 'ACCEPTED',
      proposal: {
        id: 'prop-3',
        status: 'APPROVED',
      },
    });
  });

  it('transitions to PENDING_DOCUMENTS via requestDocuments', async () => {
    const result = await firstValueFrom(
      service.requestDocuments('prop-1', {
        requiredDocuments: [{ type: 'FORM_A', description: 'Fill in form A' }],
        note: 'Please submit',
      }),
    );
    expect(result.status).toBe('PENDING_DOCUMENTS');
    expect(result.requestedDocuments.length).toBe(1);

    const updated = await firstValueFrom(service.getProposal('prop-1'));
    expect(updated.status).toBe('PENDING_DOCUMENTS');
  });

  it('creates a new proposal and lists it', async () => {
    const created = await firstValueFrom(
      service.createProposal({
        title: 'New study',
        type: 'RESEARCH',
        purpose: 'Test',
        beginDate: '2026-07-01',
        endDate: '2026-12-31',
      }),
    );
    expect(created.proposal.status).toBe('SUBMITTED');

    const page = await firstValueFrom(service.listProposals());
    const found = page.content.find((p) => p.id === created.proposal.id);
    expect(found).toBeDefined();
  });

  it('filters proposals by status', async () => {
    const page = await firstValueFrom(service.listProposals({ status: 'SUBMITTED' }));
    expect(page.content.every((p) => p.status === 'SUBMITTED')).toBe(true);
  });

  it('filters proposals by requester permission', async () => {
    const page = await firstValueFrom(service.listProposals({ requestedBy: 'perm-alice' }));
    expect(page.content.length).toBeGreaterThan(0);
    expect(page.content.every((p) => p.requestedBy.permissionId === 'perm-alice')).toBe(true);
  });

  it('unassigned filter returns only proposals with no assignedTo', async () => {
    const page = await firstValueFrom(
      service.listProposals({ status: 'SUBMITTED', unassigned: true }),
    );
    expect(page.content.length).toBeGreaterThan(0);
    expect(page.content.every((p) => p.assignedTo === null)).toBe(true);
    expect(page.content.every((p) => p.status === 'SUBMITTED')).toBe(true);
  });

  it('filters proposals by lifecycle phase', async () => {
    await firstValueFrom(service.assignProposal('prop-1', { note: 'Assuming' }));
    await firstValueFrom(service.approveProposal('prop-2', { note: 'Approved' }));

    const pending = await firstValueFrom(service.listProposals({ lifecyclePhase: 'PENDING' }));
    const approved = await firstValueFrom(service.listProposals({ lifecyclePhase: 'APPROVED' }));

    expect(pending.content.map((proposal) => proposal.id)).toContain('prop-1');
    expect(pending.content.map((proposal) => proposal.id)).not.toContain('prop-2');
    expect(approved.content.map((proposal) => proposal.id)).toContain('prop-2');
  });

  it('assume moves proposal into review and sets assignedTo', async () => {
    const result = await firstValueFrom(service.assignProposal('prop-1', { note: 'Assuming' }));
    expect(result.status).toBe('PENDING');
    expect(result.lastEvent.type).toBe('REVIEW_STARTED');
    expect(result.assignedTo.permissionId).toBe('perm-bob');

    const updated = await firstValueFrom(service.getProposal('prop-1'));
    expect(updated.status).toBe('PENDING');
    expect(updated.assignedTo?.permissionId).toBe('perm-bob');
  });

  it('assumes proposals with the currently logged user permission', async () => {
    sessionState.set({
      accessToken: 'mock-token',
      user: {
        id: 'u-carol',
        email: 'carol@curatorial.example.com',
        displayName: 'Carol Souza',
      },
      group: 'CURATORIAL',
      availableGroups: ['CURATORIAL'],
    });

    const result = await firstValueFrom(service.assignProposal('prop-1', { note: 'Assuming' }));

    expect(result.assignedTo.permissionId).toBe('perm-carol');

    const page = await firstValueFrom(service.listProposals({ assignedTo: 'perm-carol' }));

    expect(page.content.find((p) => p.id === 'prop-1')).toBeDefined();
  });

  it('assume removes proposal from the unassigned-SUBMITTED list', async () => {
    await firstValueFrom(service.assignProposal('prop-1', { note: '' }));

    const page = await firstValueFrom(
      service.listProposals({ status: 'SUBMITTED', unassigned: true }),
    );
    expect(page.content.find((p) => p.id === 'prop-1')).toBeUndefined();
  });

  it('assigning a target permission moves proposal into review', async () => {
    const result = await firstValueFrom(
      service.assignProposal('prop-1', {
        targetPermissionId: 'perm-carol',
        note: 'Assigning to carol',
      }),
    );
    expect(result.status).toBe('PENDING');
    expect(result.lastEvent.type).toBe('REVIEW_STARTED');
    expect(result.assignedTo.permissionId).toBe('perm-carol');
  });

  it('forwards to multi-group staff permissions from mock users without changing status', async () => {
    const result = await firstValueFrom(
      service.forwardProposal('prop-1', {
        targetPermissionId: 'perm-fran-curatorial',
        note: 'Forwarding to fran',
      }),
    );

    expect(result.status).toBe('SUBMITTED');
    expect(result.assignedTo).toMatchObject({
      permissionId: 'perm-fran-curatorial',
      group: 'CURATORIAL',
      user: {
        id: 'u-fran',
        email: 'fran@staff.example.com',
      },
    });
  });

  it('adds a watcher to proposal detail', async () => {
    const watcher = await firstValueFrom(
      service.addWatcher('prop-1', { permissionId: 'perm-carol' }),
    );

    expect(watcher).toMatchObject({
      permissionId: 'perm-carol',
      group: 'CURATORIAL',
    });

    const updated = await firstValueFrom(service.getProposal('prop-1'));

    expect(updated.watchers).toHaveLength(1);
    expect(updated.watchers[0].permissionId).toBe('perm-carol');
  });

  it('adds watchers idempotently', async () => {
    await firstValueFrom(service.addWatcher('prop-1', { permissionId: 'perm-carol' }));
    await firstValueFrom(service.addWatcher('prop-1', { permissionId: 'perm-carol' }));

    const updated = await firstValueFrom(service.getProposal('prop-1'));

    expect(updated.watchers.map((w) => w.permissionId)).toEqual(['perm-carol']);
  });

  it('removes a watcher from proposal detail', async () => {
    await firstValueFrom(service.addWatcher('prop-1', { permissionId: 'perm-carol' }));
    await firstValueFrom(service.removeWatcher('prop-1', 'perm-carol'));

    const updated = await firstValueFrom(service.getProposal('prop-1'));

    expect(updated.watchers).toEqual([]);
  });

  it('returns not found when adding an unknown watcher permission', async () => {
    await expect(
      firstValueFrom(service.addWatcher('prop-1', { permissionId: 'missing-permission' })),
    ).rejects.toMatchObject({ status: 404, error: 'PERMISSION_NOT_FOUND' });
  });

  it('returns not found when removing a permission that is not watching', async () => {
    await expect(
      firstValueFrom(service.removeWatcher('prop-1', 'perm-carol')),
    ).rejects.toMatchObject({ status: 404, error: 'WATCHER_NOT_FOUND' });
  });
});
