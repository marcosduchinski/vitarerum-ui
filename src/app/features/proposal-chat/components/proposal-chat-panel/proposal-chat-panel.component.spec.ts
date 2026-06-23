import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import {
  IntendedUseSuggestion,
  ProposalChatContext,
  ProposalChatContextQuery,
  SuggestIntendedUseRequest,
} from '../../models/proposal-chat.model';
import { PROPOSAL_CHAT_SERVICE } from '../../services/proposal-chat.service';
import { ProposalChatPanelComponent } from './proposal-chat-panel.component';
import { PROPOSAL_API_SERVICE } from '@features/collections/proposals/services/proposal-api.service';
import { ProposalDetail } from '@features/collections/proposals/models/proposal.model';

const CONTEXT: ProposalChatContext = {
  conversationId: 'conv-4',
  focusMessage: {
    messageId: 'msg-prop-4-initial',
    sentAt: '2026-06-01T10:30:00Z',
    sender: 'alice@example.test',
    subject: 'Collection use request: VRP-20260601-0004',
    body: 'I am requesting use of early laboratory instrument materials for a science history exhibition.',
  },
  proposal: {
    proposalId: 'prop-4',
    referenceNumber: 'VRP-20260601-0004',
    title: 'Science history exhibition on early laboratory instruments',
    status: 'PENDING',
    intendedUse: {
      useType: 'IN_SITU_VISIT',
      description: 'Research visit to consult instrument records.',
    },
  },
};

const SUGGESTION: IntendedUseSuggestion = {
  intendedUse: {
    useType: 'EXHIBITION',
    description: 'Public science history exhibition with early laboratory instruments.',
  },
  confidence: 0.91,
  rationale: 'The focus message asks for exhibition use and public education.',
  source: {
    conversationId: 'conv-4',
    messageId: 'msg-prop-4-initial',
  },
};

class ProposalChatServiceStub {
  readonly contextCalls: ProposalChatContextQuery[] = [];
  readonly suggestionCalls: SuggestIntendedUseRequest[] = [];
  contextResponse: Observable<ProposalChatContext> = of(CONTEXT);
  suggestionResponse: Observable<IntendedUseSuggestion> = of(SUGGESTION);

  getContext(query: ProposalChatContextQuery): Observable<ProposalChatContext> {
    this.contextCalls.push(query);
    return this.contextResponse;
  }

  suggestIntendedUse(request: SuggestIntendedUseRequest): Observable<IntendedUseSuggestion> {
    this.suggestionCalls.push(request);
    return this.suggestionResponse;
  }
}

class ProposalApiServiceStub {
  readonly updateCalls: {
    readonly proposalId: string;
    readonly intendedUse: IntendedUseSuggestion['intendedUse'];
  }[] = [];

  updateIntendedUse(proposalId: string, intendedUse: IntendedUseSuggestion['intendedUse']) {
    this.updateCalls.push({ proposalId, intendedUse });
    const updated: ProposalDetail = {
      id: proposalId,
      referenceNumber: CONTEXT.proposal.referenceNumber,
      title: CONTEXT.proposal.title,
      status: CONTEXT.proposal.status,
      type: intendedUse.useType,
      intendedUse,
      requestedBy: {
        permissionId: 'perm-alice',
        user: { id: 'u-alice', name: 'Alice', email: 'alice@example.test' },
        group: 'EXTERNAL',
      },
      assignedTo: null,
      submittedAt: '2026-06-01T10:30:00Z',
      conversationId: CONTEXT.conversationId,
      documents: [],
      requestedObjects: [],
    };
    return of(updated);
  }
}

const flushMicrotasks = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

async function setup(): Promise<{
  readonly fixture: ComponentFixture<ProposalChatPanelComponent>;
  readonly componentRef: ComponentRef<ProposalChatPanelComponent>;
  readonly service: ProposalChatServiceStub;
  readonly proposalService: ProposalApiServiceStub;
}> {
  const service = new ProposalChatServiceStub();
  const proposalService = new ProposalApiServiceStub();
  await TestBed.configureTestingModule({
    imports: [ProposalChatPanelComponent],
    providers: [
      provideRouter([]),
      { provide: PROPOSAL_CHAT_SERVICE, useValue: service },
      { provide: PROPOSAL_API_SERVICE, useValue: proposalService },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ProposalChatPanelComponent);
  const componentRef = fixture.componentRef;
  componentRef.setInput('conversationId', 'conv-4');
  componentRef.setInput('messageId', 'msg-prop-4-initial');
  componentRef.setInput('thinkingDelayMs', 0);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  return { fixture, componentRef, service, proposalService };
}

const triageTask = (fixture: ComponentFixture<ProposalChatPanelComponent>): HTMLButtonElement =>
  (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
    '[data-task="intended-use"]',
  )!;

const applyButton = (
  fixture: ComponentFixture<ProposalChatPanelComponent>,
): HTMLButtonElement | null =>
  (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.agent-apply');

describe('ProposalChatPanelComponent', () => {
  it('loads ProposalChat context for the provided conversation and message', async () => {
    const { fixture, service } = await setup();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(service.contextCalls).toEqual([
      { conversationId: 'conv-4', messageId: 'msg-prop-4-initial' },
    ]);
    expect(compiled.textContent).toContain('ProposalChat');
    expect(compiled.textContent).toContain(
      'Science history exhibition on early laboratory instruments',
    );
    expect(compiled.textContent).toContain('Collection use request: VRP-20260601-0004');
    expect(compiled.textContent).toContain('Requester message');
    expect(triageTask(fixture)).not.toBeNull();
    expect(applyButton(fixture)).toBeNull();
    expect(compiled.textContent).not.toContain('Public science history exhibition');
  });

  it('hides route navigation chrome when embedded', async () => {
    const { fixture, componentRef } = await setup();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Back to assignments');

    componentRef.setInput('embedded', true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Back to assignments');
  });

  it('runs intended-use triage when the task is delegated', async () => {
    const { fixture, service } = await setup();
    const compiled = fixture.nativeElement as HTMLElement;

    triageTask(fixture).click();
    await flushMicrotasks();
    fixture.detectChanges();

    expect(service.suggestionCalls).toEqual([
      { conversationId: 'conv-4', messageId: 'msg-prop-4-initial' },
    ]);
    // The curator's delegated turn is recorded in the thread.
    expect(compiled.textContent).toContain('Analyse this message for its intended use.');
    expect(compiled.textContent).toContain('Suggested classification');
    expect(compiled.textContent).toContain('exhibition');
    expect(compiled.textContent).toContain('91%');
    expect(compiled.textContent).toContain(
      'The focus message asks for exhibition use and public education.',
    );
    // Technical source stays available, tucked inside the disclosure.
    expect(compiled.textContent).toContain('conv-4 / msg-prop-4-initial');
    expect(applyButton(fixture)!.disabled).toBe(false);
  });

  it('shows when the suggestion matches the current intended use', async () => {
    const { fixture, service } = await setup();
    service.suggestionResponse = of({
      ...SUGGESTION,
      intendedUse: CONTEXT.proposal.intendedUse,
      confidence: 0.76,
    });

    triageTask(fixture).click();
    await flushMicrotasks();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'This matches the proposal’s current intended use',
    );
    expect(applyButton(fixture)!.disabled).toBe(true);
  });

  it('applies a suggestion through the proposal API', async () => {
    const { fixture, proposalService } = await setup();
    const applied: ProposalDetail[] = [];
    fixture.componentInstance.applied.subscribe((proposal) => applied.push(proposal));

    triageTask(fixture).click();
    await flushMicrotasks();
    fixture.detectChanges();

    applyButton(fixture)!.click();
    await flushMicrotasks();
    fixture.detectChanges();

    expect(proposalService.updateCalls).toEqual([
      {
        proposalId: 'prop-4',
        intendedUse: SUGGESTION.intendedUse,
      },
    ]);
    expect(applied[0]).toMatchObject({
      id: 'prop-4',
      intendedUse: SUGGESTION.intendedUse,
    });
    // The applied suggestion is acknowledged in the thread.
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Applied');
  });

  it('renders model errors without replacing the loaded context', async () => {
    const { fixture, service } = await setup();
    service.suggestionResponse = throwError(() => ({
      status: 504,
      error: { error: 'MODEL_TIMEOUT', message: 'The language model did not respond in time' },
    }));

    triageTask(fixture).click();
    await flushMicrotasks();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(service.suggestionCalls).toEqual([
      { conversationId: 'conv-4', messageId: 'msg-prop-4-initial' },
    ]);
    expect(compiled.textContent).toContain(
      'Science history exhibition on early laboratory instruments',
    );
    expect(compiled.textContent).toContain('Unexpected error');
  });
});
