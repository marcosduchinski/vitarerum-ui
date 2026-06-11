import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Message, ProposalDetail } from '../../models/proposal.model';
import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';
import {
  ProposalConversationSectionComponent,
  ReplyComposerPayload,
} from './proposal-conversation-section.component';

const proposalServiceStub = {
  downloadDocument: () => of(new Blob(['mock'])),
};

const PROPOSAL: ProposalDetail = {
  id: 'proposal-1',
  referenceNumber: 'VR-2026-001',
  title: 'Photographic history of Rio de Janeiro port, 1890-1930',
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
    status: 'CREATED',
  },
  submittedAt: '2026-05-01T10:00:00',
  watchers: [],
  conversationId: 'conversation-1',
  documents: [],
  requestedObjects: [],
};

const MESSAGES: readonly Message[] = [
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
    body: '<p>Attached response.</p>',
    attachments: [{ documentId: 'document-1', fileName: 'signed-response.docx' }],
  },
];

function setRequiredInputs(
  componentRef: ComponentRef<ProposalConversationSectionComponent>,
  resetVersion = 0,
): void {
  componentRef.setInput('proposal', PROPOSAL);
  componentRef.setInput('messages', MESSAGES);
  componentRef.setInput('messagesLoading', false);
  componentRef.setInput('sendingMessage', false);
  componentRef.setInput('messageError', null);
  componentRef.setInput('replyResetVersion', resetVersion);
}

describe('ProposalConversationSectionComponent', () => {
  it('renders requester and staff messages with roles and attachments', async () => {
    await TestBed.configureTestingModule({
      imports: [ProposalConversationSectionComponent],
      providers: [{ provide: PROPOSAL_API_SERVICE, useValue: proposalServiceStub }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProposalConversationSectionComponent);
    const componentRef: ComponentRef<ProposalConversationSectionComponent> = fixture.componentRef;

    setRequiredInputs(componentRef);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const messages = Array.from(compiled.querySelectorAll<HTMLElement>('.message'));

    expect(messages).toHaveLength(2);
    expect(messages[0].textContent).toContain('Requester');
    expect(messages[0].querySelector('.pi-user')).not.toBeNull();
    expect(messages[1].textContent).toContain('COLLECTIONS MANAGEMENT');
    expect(messages[1].querySelector('.pi-briefcase')).not.toBeNull();
    expect(messages[1].textContent).toContain('signed-response.docx');
  });

  it('emits reply body and selected files, then clears when reset version changes', async () => {
    await TestBed.configureTestingModule({
      imports: [ProposalConversationSectionComponent],
      providers: [{ provide: PROPOSAL_API_SERVICE, useValue: proposalServiceStub }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProposalConversationSectionComponent);
    const componentRef: ComponentRef<ProposalConversationSectionComponent> = fixture.componentRef;
    const submitted: ReplyComposerPayload[] = [];

    setRequiredInputs(componentRef);
    fixture.componentInstance.replySubmitted.subscribe((payload) => submitted.push(payload));
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const editor = compiled.querySelector<HTMLElement>('.reply-editor');
    const fileInput = compiled.querySelector<HTMLInputElement>('#staff-response-files');
    const sendButton = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Send response'),
    );
    const file = new File(['signed'], 'signed-response.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    editor!.innerHTML = '<p>Please review the attached signed files.</p>';
    editor!.dispatchEvent(new Event('input'));
    Object.defineProperty(fileInput!, 'files', { value: [file], configurable: true });
    fileInput!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    sendButton!.click();

    expect(submitted).toEqual([
      {
        body: '<p>Please review the attached signed files.</p>',
        files: [file],
      },
    ]);

    componentRef.setInput('replyResetVersion', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(editor!.innerHTML).toBe('');
    expect(compiled.querySelector('.selected-files')).toBeNull();
  });

  it('runs browser editor commands from formatting controls', async () => {
    await TestBed.configureTestingModule({
      imports: [ProposalConversationSectionComponent],
      providers: [{ provide: PROPOSAL_API_SERVICE, useValue: proposalServiceStub }],
    }).compileComponents();

    const execCommand = vi.fn();
    Object.defineProperty(document, 'execCommand', {
      value: execCommand,
      configurable: true,
    });
    const fixture = TestBed.createComponent(ProposalConversationSectionComponent);
    const componentRef: ComponentRef<ProposalConversationSectionComponent> = fixture.componentRef;

    setRequiredInputs(componentRef);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const boldButton = compiled.querySelector<HTMLButtonElement>('[aria-label="Bold"]');

    boldButton!.click();

    expect(execCommand).toHaveBeenCalledWith('bold', false);
  });

  it('downloads an attachment via the proposal service when its button is clicked', async () => {
    const downloadDocument = vi.fn().mockReturnValue(of(new Blob(['file-bytes'])));
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [ProposalConversationSectionComponent],
      providers: [{ provide: PROPOSAL_API_SERVICE, useValue: { downloadDocument } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProposalConversationSectionComponent);
    const componentRef: ComponentRef<ProposalConversationSectionComponent> = fixture.componentRef;

    setRequiredInputs(componentRef);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const downloadButton = compiled.querySelector<HTMLButtonElement>(
      '[aria-label="Download signed-response.docx"]',
    );

    expect(downloadButton).not.toBeNull();

    downloadButton!.click();
    await fixture.whenStable();

    expect(downloadDocument).toHaveBeenCalledWith('proposal-1', 'document-1');
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});
