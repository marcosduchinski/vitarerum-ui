import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import {
  Conversation,
  ProposalDetail,
  ProposalEventsPage,
} from '../../models/proposal.model';
import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';
import { ProposalMyDetailPageComponent } from './proposal-my-detail-page.component';

const PROPOSAL: ProposalDetail = {
  id: 'proposal-1',
  status: 'UNDER_REVIEW',
  type: 'RESEARCH',
  requestedBy: {
    permissionId: 'permission-external',
    user: { id: 'user-1', name: 'Alice Ferreira', email: 'alice@example.test' },
    group: 'EXTERNAL',
  },
  assignedTo: {
    permissionId: 'permission-staff',
    user: { id: 'staff-1', name: 'Bob Santos', email: 'bob@example.test' },
    group: 'COLLECTIONS_MANAGEMENT',
  },
  collectionUseProject: {
    id: 'project-1',
    referenceNumber: 'VR-2026-001',
    title: 'Photographic history of Rio de Janeiro port, 1890-1930',
    status: 'REQUESTED',
  },
  submittedAt: '2026-05-01T10:00:00',
  watchers: [
    {
      permissionId: 'permission-curatorial',
      user: { id: 'staff-2', name: 'Carolina Silva', email: 'carol@example.test' },
      group: 'CURATORIAL',
    },
  ],
  conversationId: 'conversation-1',
  documents: [],
  requestedDocuments: [],
};

const CONVERSATION: Conversation = {
  conversationId: 'conversation-1',
  proposalId: 'proposal-1',
  messages: [
    {
      id: 'message-1',
      sentAt: '2026-05-01T11:00:00',
      sender: 'Alice Ferreira',
      recipient: 'Collections management',
      subject: 'Initial request',
      body: 'Please review this research request.',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

const EVENTS: ProposalEventsPage = {
  proposalId: 'proposal-1',
  content: [
    {
      occurredAt: '2026-05-01T10:00:00',
      type: 'SUBMITTED',
      triggeredBy: PROPOSAL.requestedBy,
      note: 'Submitted for review.',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

class ProposalApiServiceStub {
  readonly approveCalls: Array<{
    readonly proposalId: string;
    readonly payload: { readonly note: string };
  }> = [];
  readonly rejectCalls: Array<{
    readonly proposalId: string;
    readonly payload: { readonly reason: string };
  }> = [];

  getProposal() {
    return of(PROPOSAL);
  }

  getConversation() {
    return of(CONVERSATION);
  }

  listEvents() {
    return of(EVENTS);
  }

  approveProposal(proposalId: string, payload: { readonly note: string }) {
    this.approveCalls.push({ proposalId, payload });
    return of({
      proposal: {
        id: proposalId,
        status: 'APPROVED' as const,
        lastEvent: EVENTS.content[0],
      },
      collectionUseProject: {
        ...PROPOSAL.collectionUseProject,
        status: 'ACCEPTED' as const,
      },
    });
  }

  rejectProposal(proposalId: string, payload: { readonly reason: string }) {
    this.rejectCalls.push({ proposalId, payload });
    return of({
      proposal: {
        id: proposalId,
        status: 'REJECTED' as const,
        lastEvent: EVENTS.content[0],
      },
      collectionUseProject: {
        ...PROPOSAL.collectionUseProject,
        status: 'REFUSED' as const,
      },
    });
  }
}

describe('ProposalMyDetailPageComponent', () => {
  let proposalService: ProposalApiServiceStub;

  beforeEach(async () => {
    proposalService = new ProposalApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [ProposalMyDetailPageComponent],
      providers: [
        provideRouter([]),
        { provide: PROPOSAL_API_SERVICE, useValue: proposalService },
      ],
    }).compileComponents();
  });

  it('renders the assignment detail context from the proposal workflow', async () => {
    const fixture = TestBed.createComponent(ProposalMyDetailPageComponent);
    const componentRef: ComponentRef<ProposalMyDetailPageComponent> = fixture.componentRef;

    componentRef.setInput('id', 'proposal-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Back to my assignments');
    expect(compiled.querySelector('a[href="/p/collections/proposals/my"]')).not.toBeNull();
    expect(compiled.textContent).toContain('VR-2026-001');
    expect(compiled.textContent).toContain('Photographic history of Rio de Janeiro port');
    expect(compiled.textContent).toContain('Under review');
    expect(compiled.textContent).toContain('Requested by');
    expect(compiled.textContent).toContain('Alice Ferreira');
    expect(compiled.textContent).toContain('Assigned to');
    expect(compiled.textContent).toContain('Bob Santos');
    expect(compiled.textContent).toContain('Conversation');
    expect(compiled.textContent).toContain('Initial request');
    expect(compiled.textContent).toContain('Watchers');
    expect(compiled.textContent).toContain('Carolina Silva');
    expect(compiled.textContent).toContain('Event log');
    expect(compiled.textContent).toContain('SUBMITTED');
    expect(compiled.textContent).toContain('Accept');
    expect(compiled.textContent).toContain('Reject');
  });

  it('confirms accepting the assignment and navigates to the approved list', async () => {
    const fixture = TestBed.createComponent(ProposalMyDetailPageComponent);
    const componentRef: ComponentRef<ProposalMyDetailPageComponent> = fixture.componentRef;

    componentRef.setInput('id', 'proposal-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const compiled = fixture.nativeElement as HTMLElement;
    const acceptButton = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Accept'),
    );

    expect(acceptButton).not.toBeNull();

    acceptButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(proposalService.approveCalls).toEqual([]);
    expect(compiled.textContent).toContain('Accept assignment?');

    const confirm = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
    ).find((button) => button.textContent?.trim() === 'Accept assignment');

    expect(confirm).not.toBeNull();

    confirm!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(proposalService.approveCalls).toEqual([
      {
        proposalId: 'proposal-1',
        payload: { note: 'Accepted from my assignment detail.' },
      },
    ]);
    expect(navigateSpy).toHaveBeenCalledWith(['/p/collections/proposals/approved']);
  });

  it('requires a reason before rejecting the assignment', async () => {
    const fixture = TestBed.createComponent(ProposalMyDetailPageComponent);
    const componentRef: ComponentRef<ProposalMyDetailPageComponent> = fixture.componentRef;

    componentRef.setInput('id', 'proposal-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const rejectToggle = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Reject'),
    );

    expect(rejectToggle).not.toBeNull();

    rejectToggle!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const submit = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Reject proposal'),
    );

    expect(submit).not.toBeNull();
    expect(submit!.disabled).toBe(true);
    expect(proposalService.rejectCalls).toEqual([]);
  });

  it('confirms rejecting the assignment and navigates to the rejected list', async () => {
    const fixture = TestBed.createComponent(ProposalMyDetailPageComponent);
    const componentRef: ComponentRef<ProposalMyDetailPageComponent> = fixture.componentRef;

    componentRef.setInput('id', 'proposal-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const compiled = fixture.nativeElement as HTMLElement;
    const rejectToggle = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Reject'),
    );

    rejectToggle!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const reason = compiled.querySelector<HTMLTextAreaElement>('#rejection-reason');
    const submit = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Reject proposal'),
    );

    expect(reason).not.toBeNull();
    expect(submit).not.toBeNull();

    reason!.value = 'The request does not meet collection access criteria.';
    reason!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    submit!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(proposalService.rejectCalls).toEqual([]);
    expect(compiled.textContent).toContain('Reject proposal?');

    const confirm = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
    ).find((button) => button.textContent?.trim() === 'Reject proposal');

    expect(confirm).not.toBeNull();

    confirm!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(proposalService.rejectCalls).toEqual([
      {
        proposalId: 'proposal-1',
        payload: { reason: 'The request does not meet collection access criteria.' },
      },
    ]);
    expect(navigateSpy).toHaveBeenCalledWith(['/p/collections/proposals/rejected']);
  });
});
