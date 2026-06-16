import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import {
  AddAssistanceTurnRequest,
  AssistanceSession,
  SearchObjectsRequest,
  StartProposalAgentSessionRequest,
} from '../../models/assistance.model';
import { AI_STAFF_ASSISTANCE_SERVICE } from '../../services/ai-staff-assistance.service';
import { ProposalAgentPageComponent } from './proposal-agent-page.component';

const SESSION: AssistanceSession = {
  id: 'session-1',
  agent: 'PROPOSAL_AGENT',
  title: 'ProposalAgent - VRP-20260601-0004',
  createdBy: {
    permissionId: 'perm-bob',
    user: { id: 'u-bob', name: 'Bob Santos', email: 'bob@example.test' },
    group: 'COLLECTIONS_MANAGEMENT',
  },
  target: {
    type: 'PROPOSAL_MESSAGE',
    proposalId: 'prop-4',
    conversationId: 'conv-4',
    messageId: 'msg-prop-4-initial',
  },
  status: 'ACTIVE',
  selectedMessage: {
    id: 'msg-prop-4-initial',
    sentAt: '2026-06-01T10:30:00Z',
    sender: 'alice@example.test',
    recipient: 'collections@example.test',
    subject: 'Collection use request: VR-2026-004',
    body: 'I am requesting use of early laboratory instrument materials for a science history exhibition.',
  },
  proposalSnapshot: {
    id: 'prop-4',
    referenceNumber: 'VRP-20260601-0004',
    title: 'Science history exhibition on early laboratory instruments',
    status: 'PENDING',
    type: 'EXHIBITION',
    intendedUse: {
      useType: 'EXHIBITION',
      description: 'Public science history exhibition with selected early laboratory instruments.',
    },
    requestedBy: {
      permissionId: 'perm-alice',
      user: { id: 'u-alice', name: 'Alice Ferreira', email: 'alice@example.test' },
      group: 'EXTERNAL',
    },
    assignedTo: {
      permissionId: 'perm-bob',
      user: { id: 'u-bob', name: 'Bob Santos', email: 'bob@example.test' },
      group: 'COLLECTIONS_MANAGEMENT',
    },
    submittedAt: '2026-06-01T10:30:00Z',
    conversationId: 'conv-4',
    documents: [
      {
        id: 'doc-prop-4-exhibition-brief',
        type: 'REQUESTER_ATTACHMENT',
        fileName: 'laboratory-instruments-exhibition-brief.pdf',
        submittedAt: '2026-06-01T10:30:00Z',
        submittedBy: {
          permissionId: 'perm-alice',
          user: { id: 'u-alice', name: 'Alice Ferreira', email: 'alice@example.test' },
          group: 'EXTERNAL',
        },
      },
    ],
    requestedObjects: [],
  },
  accessibleDocuments: [
    {
      id: 'doc-prop-4-exhibition-brief',
      type: 'REQUESTER_ATTACHMENT',
      fileName: 'laboratory-instruments-exhibition-brief.pdf',
      submittedAt: '2026-06-01T10:30:00Z',
      submittedBy: {
        permissionId: 'perm-alice',
        user: { id: 'u-alice', name: 'Alice Ferreira', email: 'alice@example.test' },
        group: 'EXTERNAL',
      },
    },
  ],
  turns: [
    {
      id: 'turn-1',
      role: 'AGENT',
      content:
        'I triaged this message as exhibition with high confidence and found 3 relevant documents.',
      createdAt: '2026-06-01T10:31:00Z',
    },
  ],
  proposalAgentRuns: [
    {
      id: 'run-1',
      status: 'NEEDS_STAFF_INPUT',
      capabilities: ['EMAIL_TRIAGE', 'DOCUMENT_SEARCH', 'OBJECT_SEARCH'],
      triage: {
        probableUseType: 'EXHIBITION',
        confidence: 'HIGH',
        rationale: 'The message and proposal description match exhibition use.',
        evidence: ['Matched "exhibition".'],
      },
      documentSearch: {
        query: 'EXHIBITION proposal assistance documents',
        basedOnUseType: 'EXHIBITION',
        summary: 'Found 3 documents relevant to exhibition.',
        matches: [
          {
            documentId: 'doc-prop-4-exhibition-brief',
            fileName: 'laboratory-instruments-exhibition-brief.pdf',
            type: 'REQUESTER_ATTACHMENT',
            source: 'PROPOSAL_ATTACHMENT',
            reason: 'Attached to the selected requester message.',
          },
          {
            documentId: 'catalog-doc-exhibition-loan-conditions',
            fileName: 'exhibition-loan-conditions.pdf',
            type: 'ASSISTANCE_GUIDE',
            source: 'ASSISTANCE_CATALOG',
            reason: 'Exhibition requests usually need display conditions.',
          },
        ],
      },
      objectSearch: {
        status: 'NEEDS_MORE_INFORMATION',
        query: null,
        matches: [],
        missingInformation: ['inventory number', 'object name'],
        summary: 'Object search needs more information.',
      },
      createdAt: '2026-06-01T10:31:00Z',
      completedAt: null,
    },
  ],
  createdAt: '2026-06-01T10:31:00Z',
  archivedAt: null,
};

class AiStaffAssistanceServiceStub {
  readonly startCalls: StartProposalAgentSessionRequest[] = [];
  readonly turnCalls: { readonly sessionId: string; readonly request: AddAssistanceTurnRequest }[] =
    [];
  readonly objectSearchCalls: {
    readonly sessionId: string;
    readonly request: SearchObjectsRequest;
  }[] = [];

  private session = SESSION;

  startProposalAgentSession(request: StartProposalAgentSessionRequest) {
    this.startCalls.push(request);
    return of(this.session);
  }

  addTurn(sessionId: string, request: AddAssistanceTurnRequest) {
    this.turnCalls.push({ sessionId, request });
    this.session = {
      ...this.session,
      turns: [
        ...this.session.turns,
        { id: 'turn-staff', role: 'STAFF', content: request.content, createdAt: 'now' },
        {
          id: 'turn-agent',
          role: 'AGENT',
          content: 'Current triage is exhibition with high confidence.',
          createdAt: 'now',
        },
      ],
    };
    return of(this.session);
  }

  searchObjects(sessionId: string, request: SearchObjectsRequest) {
    this.objectSearchCalls.push({ sessionId, request });
    const run = this.session.proposalAgentRuns[0];
    this.session = {
      ...this.session,
      proposalAgentRuns: [
        {
          ...run,
          status: 'COMPLETED',
          objectSearch: {
            status: 'SEARCHED',
            query: request.query,
            missingInformation: [],
            summary: 'Found 1 object matching laboratory.',
            matches: [
              {
                inventoryNumber: 'INV-HIST-LAB-004',
                displayTitle: 'Early laboratory microscope',
                objectName: 'Microscope',
                briefDescriptionSnapshot: 'Laboratory instrument.',
              },
            ],
          },
        },
      ],
      turns: [
        ...this.session.turns,
        {
          id: 'turn-object',
          role: 'AGENT',
          content: 'Found 1 object matching laboratory.',
          createdAt: 'now',
        },
      ],
    };
    return of(this.session);
  }
}

async function setup(): Promise<{
  readonly fixture: ComponentFixture<ProposalAgentPageComponent>;
  readonly componentRef: ComponentRef<ProposalAgentPageComponent>;
  readonly service: AiStaffAssistanceServiceStub;
}> {
  const service = new AiStaffAssistanceServiceStub();
  await TestBed.configureTestingModule({
    imports: [ProposalAgentPageComponent],
    providers: [
      provideRouter([]),
      { provide: AI_STAFF_ASSISTANCE_SERVICE, useValue: service },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ProposalAgentPageComponent);
  const componentRef = fixture.componentRef;
  componentRef.setInput('id', 'prop-4');
  componentRef.setInput('messageId', 'msg-prop-4-initial');
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  return { fixture, componentRef, service };
}

describe('ProposalAgentPageComponent', () => {
  it('renders selected message and ProposalAgent options before a capability is selected', async () => {
    const { fixture, service } = await setup();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(service.startCalls).toEqual([
      { proposalId: 'prop-4', messageId: 'msg-prop-4-initial' },
    ]);
    expect(compiled.textContent).toContain('ProposalAgent');
    expect(compiled.textContent).toContain('VRP-20260601-0004');
    expect(compiled.textContent).toContain('AI Assistance chat');
    expect(compiled.textContent).toContain('Choose an assistance to continue');
    expect(compiled.textContent).toContain('Email triage');
    expect(compiled.textContent).toContain('Document search');
    expect(compiled.textContent).toContain('Object search');
    expect(compiled.textContent).toContain('Collection use request: VR-2026-004');
    expect(compiled.textContent).not.toContain('exhibition-loan-conditions.pdf');
    expect(compiled.textContent).not.toContain('Object search needs more information');
  });

  it('shows the selected staff action and matching assistant result', async () => {
    const { fixture } = await setup();
    const compiled = fixture.nativeElement as HTMLElement;
    const emailTriageButton = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('.proposal-agent-options__item'),
    ).find((button) => button.textContent?.includes('Email triage'));

    emailTriageButton!.click();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Run Email triage.');
    expect(compiled.textContent).toContain('high confidence');
    expect(compiled.textContent).toContain('The message and proposal description match exhibition use.');
    expect(compiled.textContent).not.toContain('exhibition-loan-conditions.pdf');
  });

  it('hides route navigation chrome when embedded', async () => {
    const { fixture, componentRef } = await setup();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Back to assignment');

    componentRef.setInput('embedded', true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Back to assignment');
  });

  it('sends chat turns through the assistance service', async () => {
    const { fixture, service } = await setup();
    const compiled = fixture.nativeElement as HTMLElement;
    const textarea = compiled.querySelector<HTMLTextAreaElement>('#chat-message');
    const sendButton = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Send'),
    );

    textarea!.value = 'Explain the triage.';
    textarea!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    sendButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.turnCalls).toEqual([
      { sessionId: 'session-1', request: { content: 'Explain the triage.' } },
    ]);
    expect(compiled.textContent).toContain('Current triage is exhibition with high confidence.');
  });

  it('runs object search through the assistance service', async () => {
    const { fixture, service } = await setup();
    const compiled = fixture.nativeElement as HTMLElement;
    const objectSearchButton = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('.proposal-agent-options__item'),
    ).find((button) => button.textContent?.includes('Object search'));

    objectSearchButton!.click();
    fixture.detectChanges();

    const input = compiled.querySelector<HTMLInputElement>('#object-query');
    const searchForm = compiled.querySelector<HTMLFormElement>(
      'form[aria-label="Search collection objects"]',
    );
    const searchButton = searchForm!.querySelector<HTMLButtonElement>('button[type="submit"]');

    input!.value = 'laboratory';
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    searchButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.objectSearchCalls).toEqual([
      { sessionId: 'session-1', request: { query: 'laboratory' } },
    ]);
    expect(compiled.textContent).toContain('INV-HIST-LAB-004');
    expect(compiled.textContent).toContain('Found 1 object matching laboratory.');
  });
});
