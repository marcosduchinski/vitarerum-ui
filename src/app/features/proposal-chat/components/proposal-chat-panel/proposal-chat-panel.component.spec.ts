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
    expect(compiled.textContent).toContain('Current intended use');
    expect(compiled.textContent).toContain('in situ visit');
    expect(compiled.textContent).toContain('Run triage');
    expect(compiled.textContent).not.toContain('Public science history exhibition');
  });

  it('hides route navigation chrome when embedded', async () => {
    const { fixture, componentRef } = await setup();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Back to assignments');

    componentRef.setInput('embedded', true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Back to assignments');
  });

  it('runs intended-use triage on explicit staff action', async () => {
    const { fixture, service } = await setup();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector<HTMLButtonElement>('.proposal-chat-action--primary')!.click();
    await flushMicrotasks();
    fixture.detectChanges();

    expect(service.suggestionCalls).toEqual([
      { conversationId: 'conv-4', messageId: 'msg-prop-4-initial' },
    ]);
    expect(compiled.textContent).toContain('Suggested intended use');
    expect(compiled.textContent).toContain('exhibition');
    expect(compiled.textContent).toContain('91%');
    expect(compiled.textContent).toContain(
      'The focus message asks for exhibition use and public education.',
    );
    expect(compiled.textContent).toContain('conv-4 / msg-prop-4-initial');
  });

  it('shows when the suggestion matches the current intended use', async () => {
    const { fixture, service } = await setup();
    service.suggestionResponse = of({
      ...SUGGESTION,
      intendedUse: CONTEXT.proposal.intendedUse,
      confidence: 0.76,
    });

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.proposal-chat-action--primary')!
      .click();
    await flushMicrotasks();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "The suggestion matches the proposal's current intended use.",
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.proposal-chat-action',
      )[1].disabled,
    ).toBe(true);
  });

  it('applies a suggestion through the proposal API', async () => {
    const { fixture, proposalService } = await setup();
    const applied: ProposalDetail[] = [];
    fixture.componentInstance.applied.subscribe((proposal) => applied.push(proposal));

    const buttons = () =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
          '.proposal-chat-action',
        ),
      );

    buttons()[0].click();
    await flushMicrotasks();
    fixture.detectChanges();

    buttons()[1].click();
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
  });

  it('renders model errors without replacing the loaded context', async () => {
    const { fixture, service } = await setup();
    service.suggestionResponse = throwError(() => ({
      status: 504,
      error: { error: 'MODEL_TIMEOUT', message: 'The language model did not respond in time' },
    }));

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.proposal-chat-action--primary')!
      .click();
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
