import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { IDENTITY_SERVICE, IdentityService } from '@core/auth/identity.service';
import { IdentitySession } from '@core/auth/models/identity-session.model';

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
  signIn: () => {},
  signOut: () => sessionState.set(null),
  getAccessToken: () => sessionState()?.accessToken ?? null,
  setGroup: () => {},
  updateAvailableGroups: () => {},
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

  it('transitions to APPROVED and updates event log', async () => {
    const result = await firstValueFrom(service.approveProposal('prop-3', { note: 'Looks good' }));
    expect(result.proposal.status).toBe('APPROVED');
    expect(result.collectionUseProject.status).toBe('ACCEPTED');

    const events = await firstValueFrom(service.listEvents('prop-3'));
    const last = events.content[events.content.length - 1];
    expect(last.type).toBe('APPROVED');
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

  it('unassigned filter returns only proposals with no assignedTo', async () => {
    const page = await firstValueFrom(
      service.listProposals({ status: 'SUBMITTED', unassigned: true }),
    );
    expect(page.content.length).toBeGreaterThan(0);
    expect(page.content.every((p) => p.assignedTo === null)).toBe(true);
    expect(page.content.every((p) => p.status === 'SUBMITTED')).toBe(true);
  });

  it('assume preserves proposal status and sets assignedTo', async () => {
    const result = await firstValueFrom(service.assignProposal('prop-1', { note: 'Assuming' }));
    expect(result.status).toBe('SUBMITTED');
    expect(result.assignedTo.permissionId).toBe('perm-bob');

    const updated = await firstValueFrom(service.getProposal('prop-1'));
    expect(updated.status).toBe('SUBMITTED');
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

  it('assign preserves status when assigning a target permission', async () => {
    const result = await firstValueFrom(
      service.assignProposal('prop-1', {
        targetPermissionId: 'perm-carol',
        note: 'Assigning to carol',
      }),
    );
    expect(result.status).toBe('SUBMITTED');
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
