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

const TRIAGE = {
  probableUseType: 'EXHIBITION' as const,
  confidence: 'HIGH' as const,
  rationale: 'The message and proposal description match exhibition use.',
  evidence: ['Matched "exhibition".'],
};

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
    documents: [],
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
  // The opening turn invites a question and withholds the triage conclusion.
  turns: [
    {
      id: 'turn-1',
      role: 'AGENT',
      content:
        "I've reviewed the requester's message and pulled in 1 attachment. Where would you like to start?",
      createdAt: '2026-06-01T10:31:00Z',
    },
  ],
  proposalAgentRuns: [
    {
      id: 'run-1',
      status: 'NEEDS_STAFF_INPUT',
      capabilities: ['EMAIL_TRIAGE', 'DOCUMENT_SEARCH', 'OBJECT_SEARCH'],
      triage: TRIAGE,
      documentSearch: {
        query: 'EXHIBITION proposal assistance documents',
        basedOnUseType: 'EXHIBITION',
        summary: 'Found 1 document relevant to exhibition.',
        matches: [],
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
    const wantsObjects = /object|collection|inventory/i.test(request.content);
    const agentTurn = wantsObjects
      ? {
          id: 'turn-agent',
          role: 'AGENT' as const,
          content:
            'Give me an inventory number, object name, or description and I will look it up.',
          result: {
            kind: 'OBJECT_SEARCH' as const,
            objectSearch: {
              status: 'NEEDS_MORE_INFORMATION' as const,
              query: null,
              matches: [],
              missingInformation: ['inventory number', 'object name'],
              summary: 'Object search needs more information.',
            },
          },
          createdAt: 'now',
        }
      : {
          id: 'turn-agent',
          role: 'AGENT' as const,
          content: 'I read this as an exhibition request — high confidence.',
          result: { kind: 'TRIAGE' as const, triage: TRIAGE },
          createdAt: 'now',
        };
    this.session = {
      ...this.session,
      turns: [
        ...this.session.turns,
        { id: 'turn-staff', role: 'STAFF', content: request.content, createdAt: 'now' },
        agentTurn,
      ],
    };
    return of(this.session);
  }

  searchObjects(sessionId: string, request: SearchObjectsRequest) {
    this.objectSearchCalls.push({ sessionId, request });
    const objectSearch = {
      status: 'SEARCHED' as const,
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
    };
    this.session = {
      ...this.session,
      turns: [
        ...this.session.turns,
        {
          id: 'turn-object-staff',
          role: 'STAFF',
          content: `Search the collection for "${request.query}".`,
          createdAt: 'now',
        },
        {
          id: 'turn-object-agent',
          role: 'AGENT',
          content: 'Found 1 object matching laboratory.',
          result: { kind: 'OBJECT_SEARCH', objectSearch },
          createdAt: 'now',
        },
      ],
    };
    return of(this.session);
  }
}

const flushMicrotasks = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

async function setup(): Promise<{
  readonly fixture: ComponentFixture<ProposalAgentPageComponent>;
  readonly componentRef: ComponentRef<ProposalAgentPageComponent>;
  readonly service: AiStaffAssistanceServiceStub;
}> {
  const service = new AiStaffAssistanceServiceStub();
  await TestBed.configureTestingModule({
    imports: [ProposalAgentPageComponent],
    providers: [provideRouter([]), { provide: AI_STAFF_ASSISTANCE_SERVICE, useValue: service }],
  }).compileComponents();

  const fixture = TestBed.createComponent(ProposalAgentPageComponent);
  const componentRef = fixture.componentRef;
  componentRef.setInput('id', 'prop-4');
  componentRef.setInput('messageId', 'msg-prop-4-initial');
  // Disable animation timers so interactions resolve synchronously in tests.
  componentRef.setInput('thinkingDelayMs', 0);
  componentRef.setInput('streamWordDelayMs', 0);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  return { fixture, componentRef, service };
}

describe('ProposalAgentPageComponent', () => {
  it('opens with a withheld greeting, suggested prompts, and no revealed conclusions', async () => {
    const { fixture, service } = await setup();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(service.startCalls).toEqual([{ proposalId: 'prop-4', messageId: 'msg-prop-4-initial' }]);
    expect(compiled.textContent).toContain('Where would you like to start?');
    expect(compiled.textContent).toContain('Collection use request: VR-2026-004');

    const chips = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('.proposal-agent-suggestions__chip'),
    ).map((chip) => chip.textContent?.trim());
    expect(chips).toEqual(
      expect.arrayContaining([
        'Do the email triage',
        'Find relevant documents',
        'Search for an object',
      ]),
    );

    // Conclusions stay behind the veil until asked.
    expect(compiled.textContent).not.toContain('Email triage');
    expect(compiled.textContent).not.toContain('high confidence');
  });

  it('hides route navigation chrome when embedded', async () => {
    const { fixture, componentRef } = await setup();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Back to assignment');

    componentRef.setInput('embedded', true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Back to assignment');
  });

  it('reveals the triage card when a suggested prompt is used', async () => {
    const { fixture, service } = await setup();
    const compiled = fixture.nativeElement as HTMLElement;

    const triageChip = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('.proposal-agent-suggestions__chip'),
    ).find((chip) => chip.textContent?.includes('Do the email triage'));

    triageChip!.click();
    await flushMicrotasks();
    fixture.detectChanges();

    expect(service.turnCalls).toEqual([
      { sessionId: 'session-1', request: { content: 'Could you do the email triage?' } },
    ]);
    expect(compiled.textContent).toContain('Email triage');
    expect(compiled.textContent).toContain('high confidence');
    expect(compiled.textContent).toContain(
      'The message and proposal description match exhibition use.',
    );
    // The triage chip is consumed once the capability is revealed.
    expect(
      Array.from(
        compiled.querySelectorAll<HTMLButtonElement>('.proposal-agent-suggestions__chip'),
      ).map((chip) => chip.textContent?.trim()),
    ).not.toContain('Do the email triage');
  });

  it('sends free-text chat turns through the assistance service', async () => {
    const { fixture, service } = await setup();
    const compiled = fixture.nativeElement as HTMLElement;
    const textarea = compiled.querySelector<HTMLTextAreaElement>('#chat-message');
    const sendButton = compiled.querySelector<HTMLButtonElement>(
      'button[aria-label="Send message"]',
    );

    textarea!.value = 'Explain the triage.';
    textarea!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    sendButton!.click();
    await flushMicrotasks();
    fixture.detectChanges();

    expect(service.turnCalls).toEqual([
      { sessionId: 'session-1', request: { content: 'Explain the triage.' } },
    ]);
    expect(compiled.textContent).toContain('Explain the triage.');
    expect(compiled.textContent).toContain(
      'I read this as an exhibition request — high confidence.',
    );
  });

  it('runs object search and reveals matches inline', async () => {
    const { fixture, service } = await setup();
    let compiled = fixture.nativeElement as HTMLElement;

    // Ask about objects to reveal the object-search card (with its query form).
    const objectChip = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('.proposal-agent-suggestions__chip'),
    ).find((chip) => chip.textContent?.includes('Search for an object'));
    objectChip!.click();
    await flushMicrotasks();
    fixture.detectChanges();

    compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector<HTMLInputElement>('#object-query');
    expect(input).not.toBeNull();

    input!.value = 'laboratory';
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const searchForm = compiled.querySelector<HTMLFormElement>(
      'form[aria-label="Search collection objects"]',
    );
    searchForm!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushMicrotasks();
    fixture.detectChanges();

    expect(service.objectSearchCalls).toEqual([
      { sessionId: 'session-1', request: { query: 'laboratory' } },
    ]);
    expect(compiled.textContent).toContain('INV-HIST-LAB-004');
    expect(compiled.textContent).toContain('Found 1 object matching laboratory.');
  });
});
