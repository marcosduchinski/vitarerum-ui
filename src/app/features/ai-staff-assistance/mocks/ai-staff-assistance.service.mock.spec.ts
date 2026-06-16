import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { IDENTITY_SERVICE, IdentityService } from '@core/auth/identity.service';
import { GroupName } from '@core/auth/models/group-name.enum';
import { IdentitySession } from '@core/auth/models/identity-session.model';
import { LoginRequest } from '@core/auth/models/login.model';
import { ProjectApiServiceMock } from '@features/collections/projects/mocks/project-api.service.mock';
import {
  MOCK_SEED,
  MockProjectState,
  TEST_SEED,
} from '@features/collections/proposals/mocks/mock-data';
import { ProposalApiServiceMock } from '@features/collections/proposals/mocks/proposal-api.service.mock';
import { PROPOSAL_API_SERVICE } from '@features/collections/proposals/services/proposal-api.service';

import { AiStaffAssistanceServiceMock } from './ai-staff-assistance.service.mock';

const staffSession: IdentitySession = {
  accessToken: 'mock-token',
  user: {
    id: 'u-bob',
    email: 'bob@collections.example.com',
    displayName: 'Bob Santos',
  },
  group: 'COLLECTIONS_MANAGEMENT',
  availableGroups: ['COLLECTIONS_MANAGEMENT'],
  permissions: [{ permissionId: 'perm-bob', group: 'COLLECTIONS_MANAGEMENT' }],
};

const sessionState = signal<IdentitySession | null>(staffSession);

const identityStub: IdentityService = {
  session: sessionState.asReadonly(),
  isAuthenticated: signal(true).asReadonly(),
  isStaff: signal(true).asReadonly(),
  signIn: async (credentials: LoginRequest) => {
    const session = sessionState();
    if (session) {
      sessionState.set({ ...session, user: { ...session.user, email: credentials.email } });
    }
  },
  signOut: () => sessionState.set(null),
  getAccessToken: () => sessionState()?.accessToken ?? null,
  getPermissionId: () =>
    sessionState()?.permissions?.find((permission) => permission.group === sessionState()?.group)
      ?.permissionId ?? null,
  setGroup: (group: GroupName) => {
    const session = sessionState();
    if (session) sessionState.set({ ...session, group });
  },
  updateAvailableGroups: (groups: readonly GroupName[]) => {
    const session = sessionState();
    if (session) sessionState.set({ ...session, availableGroups: groups });
  },
};

describe('AiStaffAssistanceServiceMock', () => {
  let service: AiStaffAssistanceServiceMock;

  beforeEach(() => {
    sessionState.set(staffSession);

    TestBed.configureTestingModule({
      providers: [
        AiStaffAssistanceServiceMock,
        ProposalApiServiceMock,
        ProjectApiServiceMock,
        MockProjectState,
        { provide: MOCK_SEED, useValue: TEST_SEED },
        { provide: IDENTITY_SERVICE, useValue: identityStub },
        { provide: PROPOSAL_API_SERVICE, useExisting: ProposalApiServiceMock },
      ],
    });

    service = TestBed.inject(AiStaffAssistanceServiceMock);
  });

  it('triages exhibition email messages and searches exhibition documents', async () => {
    const session = await firstValueFrom(
      service.startProposalAgentSession({
        proposalId: 'prop-4',
        messageId: 'msg-prop-4-initial',
      }),
    );

    const run = session.proposalAgentRuns[0];

    expect(run.triage).toMatchObject({
      probableUseType: 'EXHIBITION',
      confidence: 'HIGH',
    });
    expect(run.triage?.evidence.join(' ')).toContain('exhibition');
    expect(run.documentSearch?.basedOnUseType).toBe('EXHIBITION');
    expect(run.documentSearch?.matches.map((match) => match.fileName)).toEqual(
      expect.arrayContaining([
        'laboratory-instruments-exhibition-brief.pdf',
        'exhibition-loan-conditions.pdf',
      ]),
    );
  });

  it('triages research access email messages as in-situ visits', async () => {
    const session = await firstValueFrom(
      service.startProposalAgentSession({
        proposalId: 'prop-1',
        messageId: 'msg-prop-1-initial',
      }),
    );

    const run = session.proposalAgentRuns[0];

    expect(run.triage).toMatchObject({
      probableUseType: 'IN_SITU_VISIT',
      confidence: 'HIGH',
    });
    expect(run.documentSearch?.matches.map((match) => match.fileName)).toEqual(
      expect.arrayContaining(['zoology-research-outline.pdf', 'in-situ-access-guidelines.pdf']),
    );
  });

  it('keeps selected message attachments separate from catalog assistance documents', async () => {
    const session = await firstValueFrom(
      service.startProposalAgentSession({
        proposalId: 'prop-4',
        messageId: 'msg-prop-4-initial',
      }),
    );

    const matches = session.proposalAgentRuns[0].documentSearch?.matches ?? [];
    const attachedDocuments = matches.filter((match) => match.source === 'PROPOSAL_ATTACHMENT');
    const catalogDocuments = matches.filter((match) => match.source === 'ASSISTANCE_CATALOG');

    expect(session.accessibleDocuments.map((document) => document.fileName)).toEqual([
      'laboratory-instruments-exhibition-brief.pdf',
      'laboratory-instruments-object-list.csv',
    ]);
    expect(attachedDocuments.map((match) => match.fileName)).toEqual([
      'laboratory-instruments-exhibition-brief.pdf',
      'laboratory-instruments-object-list.csv',
    ]);
    expect(catalogDocuments.map((match) => match.fileName)).toEqual([
      'exhibition-loan-conditions.pdf',
      'exhibition-object-checklist.xlsx',
    ]);
  });

  it('uses the triaged use type to avoid unrelated catalog documents', async () => {
    const session = await firstValueFrom(
      service.startProposalAgentSession({
        proposalId: 'prop-1',
        messageId: 'msg-prop-1-initial',
      }),
    );

    const documentSearch = session.proposalAgentRuns[0].documentSearch;

    expect(documentSearch?.basedOnUseType).toBe('IN_SITU_VISIT');
    expect(documentSearch?.matches.map((match) => match.fileName)).toEqual(
      expect.arrayContaining([
        'zoology-research-outline.pdf',
        'atlantic-forest-catalogue-list.xlsx',
        'in-situ-access-guidelines.pdf',
        'research-visit-request-form.docx',
      ]),
    );
    expect(documentSearch?.matches.map((match) => match.fileName)).not.toEqual(
      expect.arrayContaining(['exhibition-loan-conditions.pdf']),
    );
    expect(documentSearch?.summary).toContain('4 documents');
  });

  it('starts object search in a needs-more-information state', async () => {
    const session = await firstValueFrom(
      service.startProposalAgentSession({
        proposalId: 'prop-1',
        messageId: 'msg-prop-1-initial',
      }),
    );

    const objectSearch = session.proposalAgentRuns[0].objectSearch;

    expect(session.proposalAgentRuns[0].status).toBe('NEEDS_STAFF_INPUT');
    expect(objectSearch).toMatchObject({
      status: 'NEEDS_MORE_INFORMATION',
      query: null,
      matches: [],
    });
    expect(objectSearch?.missingInformation).toEqual(
      expect.arrayContaining(['inventory number', 'object name', 'collection area']),
    );
  });

  it('searches objects after staff provides object information', async () => {
    const session = await firstValueFrom(
      service.startProposalAgentSession({
        proposalId: 'prop-4',
        messageId: 'msg-prop-4-initial',
      }),
    );

    const updated = await firstValueFrom(
      service.searchObjects(session.id, { query: 'laboratory' }),
    );
    const run = updated.proposalAgentRuns[0];

    expect(run.status).toBe('COMPLETED');
    expect(run.objectSearch).toMatchObject({
      status: 'SEARCHED',
      query: 'laboratory',
      missingInformation: [],
    });
    expect(run.objectSearch?.matches.map((match) => match.inventoryNumber)).toEqual(
      expect.arrayContaining(['INV-HIST-LAB-004', 'INV-HIST-LAB-009']),
    );
    expect(updated.turns.at(-1)?.content).toContain('Found 2 objects');
  });

  it('opens with a greeting that withholds the triage conclusion', async () => {
    const session = await firstValueFrom(
      service.startProposalAgentSession({
        proposalId: 'prop-4',
        messageId: 'msg-prop-4-initial',
      }),
    );

    const greeting = session.turns[0];
    expect(greeting.role).toBe('AGENT');
    expect(greeting.result ?? null).toBeNull();
    expect(greeting.content).toContain('Where would you like to start?');
    expect(greeting.content.toLowerCase()).not.toContain('confidence');
  });

  it('reveals the triage result only when the staff asks for it', async () => {
    const session = await firstValueFrom(
      service.startProposalAgentSession({
        proposalId: 'prop-4',
        messageId: 'msg-prop-4-initial',
      }),
    );

    const updated = await firstValueFrom(
      service.addTurn(session.id, { content: 'Could you do the email triage?' }),
    );

    const agentTurn = updated.turns.at(-1);
    expect(agentTurn?.role).toBe('AGENT');
    expect(agentTurn?.result?.kind).toBe('TRIAGE');
    expect(agentTurn?.result?.triage?.probableUseType).toBe('EXHIBITION');
  });

  it('reveals the document search result when the staff asks about documents', async () => {
    const session = await firstValueFrom(
      service.startProposalAgentSession({
        proposalId: 'prop-4',
        messageId: 'msg-prop-4-initial',
      }),
    );

    const updated = await firstValueFrom(
      service.addTurn(session.id, { content: 'Which documents are relevant?' }),
    );

    const agentTurn = updated.turns.at(-1);
    expect(agentTurn?.result?.kind).toBe('DOCUMENT_SEARCH');
    expect(agentTurn?.result?.documentSearch?.basedOnUseType).toBe('EXHIBITION');
  });

  it('falls back gracefully when the staff message matches no capability', async () => {
    const session = await firstValueFrom(
      service.startProposalAgentSession({
        proposalId: 'prop-4',
        messageId: 'msg-prop-4-initial',
      }),
    );

    const updated = await firstValueFrom(service.addTurn(session.id, { content: 'Good morning!' }));

    const agentTurn = updated.turns.at(-1);
    expect(agentTurn?.result ?? null).toBeNull();
    expect(agentTurn?.content).toContain('email triage');
  });

  it('records no-match object searches without inventing results', async () => {
    const session = await firstValueFrom(
      service.startProposalAgentSession({
        proposalId: 'prop-7',
        messageId: 'msg-prop-7-initial',
      }),
    );

    const updated = await firstValueFrom(
      service.searchObjects(session.id, { query: 'nonexistent mineral display' }),
    );
    const objectSearch = updated.proposalAgentRuns[0].objectSearch;

    expect(updated.proposalAgentRuns[0].status).toBe('COMPLETED');
    expect(objectSearch).toMatchObject({
      status: 'NO_MATCHES',
      query: 'nonexistent mineral display',
      matches: [],
      missingInformation: [],
    });
    expect(objectSearch?.summary).toContain('No collection objects matched');
  });
});
