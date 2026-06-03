import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { UserDetail } from '@core/auth/models/user.model';
import { USER_MANAGEMENT_SERVICE } from '@features/admin/services/user-management.service';
import { Page } from '@shared/models/page.model';

import {
  Conversation,
  Document,
  Message,
  ProposalDetail,
  ProposalEventsPage,
  SendMessageRequest,
} from '../../models/proposal.model';
import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';
import { ProposalMyDetailPageComponent } from './proposal-my-detail-page.component';

const PROPOSAL: ProposalDetail = {
  id: 'proposal-1',
  status: 'PENDING',
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
      sender: 'alice@example.test',
      recipient: 'Collections management',
      subject: 'Initial request',
      body: 'Please review this research request.',
    },
    {
      id: 'message-2',
      sentAt: '2026-05-01T14:00:00',
      sender: 'bob@example.test',
      recipient: 'alice@example.test',
      subject: 'Response to VR-2026-001',
      body: '<p>Attached signed response for museum review.</p>',
      attachments: [
        {
          documentId: 'document-1',
          fileName: 'signed-response.docx',
          fileReference: 'mock-proposal-file-1',
        },
      ],
    },
  ],
  page: 0,
  size: 20,
  totalElements: 2,
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

const STAFF_USERS: Page<UserDetail> = {
  content: [
    {
      id: 'staff-2',
      name: 'Carolina Silva',
      email: 'carol@example.test',
      permissions: [
        {
          permissionId: 'permission-curatorial',
          group: { id: 'group-curatorial', name: 'CURATORIAL' },
        },
      ],
    },
    {
      id: 'staff-3',
      name: 'Dan Oliveira',
      email: 'dan@example.test',
      permissions: [
        {
          permissionId: 'permission-direction',
          group: { id: 'group-direction', name: 'DIRECTION' },
        },
      ],
    },
  ],
  page: 0,
  size: 100,
  totalElements: 2,
  totalPages: 1,
};

class ProposalApiServiceStub {
  readonly approveCalls: {
    readonly proposalId: string;
    readonly payload: { readonly note: string };
  }[] = [];
  readonly rejectCalls: {
    readonly proposalId: string;
    readonly payload: { readonly reason: string };
  }[] = [];
  readonly uploadCalls: {
    readonly proposalId: string;
    readonly file: File;
    readonly documentType: string;
  }[] = [];
  readonly sendMessageCalls: {
    readonly proposalId: string;
    readonly payload: SendMessageRequest;
  }[] = [];
  readonly addWatcherCalls: {
    readonly proposalId: string;
    readonly payload: { readonly permissionId: string };
  }[] = [];
  readonly removeWatcherCalls: {
    readonly proposalId: string;
    readonly permissionId: string;
  }[] = [];
  private nextDocumentId = 1;

  getProposal() {
    return of(PROPOSAL);
  }

  getConversation() {
    return of(CONVERSATION);
  }

  listEvents() {
    return of(EVENTS);
  }

  uploadDocument(proposalId: string, file: File, documentType: string) {
    const document: Document = {
      id: `uploaded-document-${this.nextDocumentId++}`,
      type: documentType,
      fileName: file.name,
      fileReference: `mock-file-reference/${file.name}`,
      submittedAt: '2026-05-02T10:00:00',
      submittedBy: PROPOSAL.assignedTo ?? undefined,
    };

    this.uploadCalls.push({ proposalId, file, documentType });
    return of(document);
  }

  sendMessage(proposalId: string, payload: SendMessageRequest) {
    const message: Message = {
      id: 'sent-message-1',
      sentAt: '2026-05-02T10:05:00',
      sender: PROPOSAL.assignedTo?.user.email ?? '',
      recipient: payload.recipient,
      subject: payload.subject,
      body: payload.body,
      attachments: payload.documentIds?.map((documentId) => ({
        documentId,
        fileName: 'signed-response.docx',
      })),
    };

    this.sendMessageCalls.push({ proposalId, payload });
    return of(message);
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

  addWatcher(proposalId: string, payload: { readonly permissionId: string }) {
    this.addWatcherCalls.push({ proposalId, payload });
    return of({
      permissionId: payload.permissionId,
      user: { id: 'staff-3', name: 'Dan Oliveira', email: 'dan@example.test' },
      group: 'DIRECTION' as const,
    });
  }

  removeWatcher(proposalId: string, permissionId: string) {
    this.removeWatcherCalls.push({ proposalId, permissionId });
    return of(undefined);
  }
}

class UserManagementServiceStub {
  listUsers() {
    return of(STAFF_USERS);
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
        { provide: USER_MANAGEMENT_SERVICE, useClass: UserManagementServiceStub },
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
    expect(compiled.textContent).toContain('signed-response.docx');
    expect(compiled.textContent).toContain('Watchers');
    expect(compiled.textContent).toContain('Carolina Silva');
    expect(compiled.textContent).toContain('Event log');
    expect(compiled.textContent).toContain('SUBMITTED');
    expect(compiled.textContent).toContain('Accept');
    expect(compiled.textContent).toContain('Reject');
  });

  it('adds and removes watchers from the assignment detail page', async () => {
    const fixture = TestBed.createComponent(ProposalMyDetailPageComponent);
    const componentRef: ComponentRef<ProposalMyDetailPageComponent> = fixture.componentRef;

    componentRef.setInput('id', 'proposal-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector<HTMLSelectElement>('#watcher-permission');
    const addButton = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === 'Add',
    );
    const removeButton = compiled.querySelector<HTMLButtonElement>(
      '[aria-label="Remove watcher Carolina Silva"]',
    );

    expect(select).not.toBeNull();
    expect(addButton).not.toBeNull();
    expect(removeButton).not.toBeNull();
    expect(select!.textContent).not.toContain('Carolina Silva');
    expect(select!.textContent).toContain('Dan Oliveira');

    select!.value = 'permission-direction';
    select!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(addButton!.disabled).toBe(false);

    addButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(proposalService.addWatcherCalls).toEqual([
      {
        proposalId: 'proposal-1',
        payload: { permissionId: 'permission-direction' },
      },
    ]);

    removeButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(proposalService.removeWatcherCalls).toEqual([
      {
        proposalId: 'proposal-1',
        permissionId: 'permission-curatorial',
      },
    ]);
  });

  it('marks requester and staff messages with distinct roles and icons', async () => {
    const fixture = TestBed.createComponent(ProposalMyDetailPageComponent);
    const componentRef: ComponentRef<ProposalMyDetailPageComponent> = fixture.componentRef;

    componentRef.setInput('id', 'proposal-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const messages = Array.from(compiled.querySelectorAll<HTMLElement>('.message'));

    expect(messages).toHaveLength(2);
    expect(messages[0].textContent).toContain('Requester');
    expect(messages[0].querySelector('.pi-user')).not.toBeNull();
    expect(messages[1].textContent).toContain('COLLECTIONS MANAGEMENT');
    expect(messages[1].querySelector('.pi-briefcase')).not.toBeNull();
    expect(messages[1].textContent).toContain('signed-response.docx');
  });

  it('uploads selected files and attaches them to a staff response message', async () => {
    const fixture = TestBed.createComponent(ProposalMyDetailPageComponent);
    const componentRef: ComponentRef<ProposalMyDetailPageComponent> = fixture.componentRef;

    componentRef.setInput('id', 'proposal-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const editor = compiled.querySelector<HTMLElement>('.reply-editor');
    const fileInput = compiled.querySelector<HTMLInputElement>('#staff-response-files');
    const sendButton = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Send response'),
    );

    expect(editor).not.toBeNull();
    expect(fileInput).not.toBeNull();
    expect(sendButton).not.toBeNull();

    editor!.innerHTML = '<p>Please review the attached signed files.</p>';
    editor!.dispatchEvent(new Event('input'));

    const file = new File(['signed'], 'signed-response.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    Object.defineProperty(fileInput!, 'files', {
      value: [file],
      configurable: true,
    });
    fileInput!.dispatchEvent(new Event('change'));

    fixture.detectChanges();

    expect(compiled.textContent).toContain('signed-response.docx');

    sendButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(proposalService.uploadCalls).toEqual([
      {
        proposalId: 'proposal-1',
        file,
        documentType: 'STAFF_RESPONSE_ATTACHMENT',
      },
    ]);
    expect(proposalService.sendMessageCalls).toEqual([
      {
        proposalId: 'proposal-1',
        payload: {
          recipient: 'alice@example.test',
          subject: 'Response to VR-2026-001',
          body: '<p>Please review the attached signed files.</p>',
          documentIds: ['uploaded-document-1'],
        },
      },
    ]);
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
