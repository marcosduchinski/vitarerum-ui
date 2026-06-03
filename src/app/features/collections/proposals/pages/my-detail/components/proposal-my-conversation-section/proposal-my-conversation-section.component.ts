import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';

import { ApiError } from '@core/http/api-error.model';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';

import { Message, ProposalDetail } from '../../../../models/proposal.model';
import { formatProposalMyDetailDateTime } from '../../proposal-my-detail.presentation';

export interface ReplyComposerPayload {
  readonly body: string;
  readonly files: readonly File[];
}

type ReplyEditorCommand = 'bold' | 'italic' | 'insertUnorderedList' | 'removeFormat';

@Component({
  selector: 'app-proposal-my-conversation-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingStateComponent, ErrorMessageComponent],
  templateUrl: './proposal-my-conversation-section.component.html',
  styleUrl: './proposal-my-conversation-section.component.scss',
})
export class ProposalMyConversationSectionComponent {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly replyEditor = viewChild<ElementRef<HTMLElement>>('replyEditor');

  readonly proposal = input.required<ProposalDetail>();
  readonly messages = input.required<readonly Message[]>();
  readonly messagesLoading = input.required<boolean>();
  readonly sendingMessage = input.required<boolean>();
  readonly messageError = input.required<ApiError | null>();
  readonly replyResetVersion = input.required<number>();
  readonly replyEyebrow = input('Staff response');
  readonly replyHeading = input('Reply to requester');
  readonly recipientEmail = input<string | null>(null);
  readonly canReply = input(true);
  readonly replySubmitted = output<ReplyComposerPayload>();

  protected readonly resolvedRecipientEmail = computed(
    () => this.recipientEmail() ?? this.proposal().requestedBy.user.email,
  );

  protected readonly selectedFiles = signal<readonly File[]>([]);
  protected readonly replyBody = signal('');
  protected readonly formatDateTime = formatProposalMyDetailDateTime;

  constructor() {
    effect(() => {
      if (this.replyResetVersion() > 0) this.clearReply();
    });
  }

  protected messageIcon(message: Message): string {
    return this.isRequesterMessage(message) ? 'pi pi-user' : 'pi pi-briefcase';
  }

  protected messageRoleLabel(message: Message): string {
    if (this.isRequesterMessage(message)) return 'Requester';
    return this.proposal().assignedTo?.group.replace('_', ' ') ?? 'Staff';
  }

  protected isRequesterMessage(message: Message): boolean {
    return message.sender === this.proposal().requestedBy.user.email;
  }

  protected onReplyInput(event: Event): void {
    this.replyBody.set((event.target as HTMLElement).innerHTML.trim());
  }

  protected applyEditorCommand(command: 'bold' | 'italic' | 'insertUnorderedList'): void {
    this.executeEditorCommand(command);
  }

  protected clearReplyFormatting(): void {
    this.executeEditorCommand('removeFormat');
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.selectedFiles.update((current) => [...current, ...files]);
    input.value = '';
  }

  protected removeSelectedFile(index: number): void {
    this.selectedFiles.update((files) => files.filter((_, i) => i !== index));
  }

  protected canSendReply(): boolean {
    return this.hasReplyContent() && !this.sendingMessage();
  }

  protected sendReply(): void {
    if (!this.canSendReply()) return;

    this.replySubmitted.emit({
      body: this.replyBody(),
      files: this.selectedFiles(),
    });
  }

  private syncReplyBody(): void {
    this.replyBody.set(this.replyEditor()?.nativeElement.innerHTML.trim() ?? '');
  }

  private executeEditorCommand(command: ReplyEditorCommand): void {
    const editor = this.replyEditor()?.nativeElement;
    if (!editor) return;

    editor.focus();
    if (isPlatformBrowser(this.platformId) && typeof this.document.execCommand === 'function') {
      this.document.execCommand(command, false);
    }
    this.syncReplyBody();
  }

  private clearReply(): void {
    const editor = this.replyEditor()?.nativeElement;
    if (editor) editor.innerHTML = '';
    this.replyBody.set('');
    this.selectedFiles.set([]);
  }

  private hasReplyContent(): boolean {
    const text = this.replyEditor()?.nativeElement.textContent?.trim() ?? '';
    return text.length > 0 || this.selectedFiles().length > 0;
  }
}
