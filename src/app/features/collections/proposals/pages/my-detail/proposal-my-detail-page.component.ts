import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ApiError, toApiError } from '@core/http/api-error.model';
import { USER_MANAGEMENT_SERVICE } from '@features/admin/services/user-management.service';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import {
  StatusChipComponent,
  WorkflowStatus,
} from '@shared/components/status-chip/status-chip.component';
import { TypeChipComponent } from '@shared/components/type-chip/type-chip.component';

import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';
import {
  ProposalMyConversationSectionComponent,
  ReplyComposerPayload,
} from './components/proposal-my-conversation-section/proposal-my-conversation-section.component';
import { ProposalMyEventsSectionComponent } from './components/proposal-my-events-section/proposal-my-events-section.component';
import { ProposalMyOverviewSectionComponent } from './components/proposal-my-overview-section/proposal-my-overview-section.component';
import {
  ProposalMyWatchersSectionComponent,
  StaffWatcherOption,
} from './components/proposal-my-watchers-section/proposal-my-watchers-section.component';
import { PROPOSAL_MY_DETAIL_GROUP_LABELS } from './proposal-my-detail.presentation';

type MyDetailPanel = 'overview' | 'watchers' | 'conversation';

@Component({
  selector: 'app-proposal-my-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LoadingStateComponent,
    ErrorMessageComponent,
    StatusChipComponent,
    TypeChipComponent,
    ConfirmModalComponent,
    ProposalMyOverviewSectionComponent,
    ProposalMyConversationSectionComponent,
    ProposalMyWatchersSectionComponent,
    ProposalMyEventsSectionComponent,
  ],
  templateUrl: './proposal-my-detail-page.component.html',
  styleUrl: './proposal-my-detail-page.component.scss',
})
export class ProposalMyDetailPageComponent {
  private readonly proposalService = inject(PROPOSAL_API_SERVICE);
  private readonly userService = inject(USER_MANAGEMENT_SERVICE);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly proposalResource = resource({
    params: () => this.id(),
    loader: ({ params }) => firstValueFrom(this.proposalService.getProposal(params)),
  });

  protected readonly conversationResource = resource({
    params: () => this.id(),
    loader: ({ params }) => firstValueFrom(this.proposalService.getConversation(params)),
  });

  protected readonly eventsResource = resource({
    params: () => this.id(),
    loader: ({ params }) => firstValueFrom(this.proposalService.listEvents(params)),
  });

  protected readonly staffUsersResource = resource({
    loader: () => firstValueFrom(this.userService.listUsers({ size: 100 })),
  });

  protected readonly proposal = computed(() => this.proposalResource.value() ?? null);
  protected readonly messages = computed(() => this.conversationResource.value()?.messages ?? []);
  protected readonly events = computed(() => this.eventsResource.value()?.content ?? []);
  protected readonly watchers = computed(() => this.proposal()?.watchers ?? []);
  protected readonly staffOptions = computed<StaffWatcherOption[]>(() =>
    (this.staffUsersResource.value()?.content ?? []).flatMap((u) =>
      u.permissions
        .filter((p) => p.group.name !== 'EXTERNAL')
        .map((p) => ({
          label: `${u.name} - ${PROPOSAL_MY_DETAIL_GROUP_LABELS[p.group.name]}`,
          permissionId: p.permissionId,
        })),
    ),
  );
  protected readonly watcherOptions = computed<StaffWatcherOption[]>(() => {
    const watcherIds = new Set(this.watchers().map((watcher) => watcher.permissionId));
    return this.staffOptions().filter((option) => !watcherIds.has(option.permissionId));
  });
  protected readonly proposalError = computed<ApiError | null>(() => {
    const err = this.proposalResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly activePanel = signal<MyDetailPanel>('overview');
  protected readonly accepting = signal(false);
  protected readonly rejecting = signal(false);
  protected readonly forwarding = signal(false);
  protected readonly requestingDocs = signal(false);
  protected readonly acceptConfirmOpen = signal(false);
  protected readonly rejectModalOpen = signal(false);
  protected readonly forwardModalOpen = signal(false);
  protected readonly requestDocsModalOpen = signal(false);
  protected readonly rejectionReason = signal('');
  // Approve materialises the project — the curator confirms its parameters here.
  protected readonly approvePurpose = signal('');
  protected readonly approveBeginDate = signal('');
  protected readonly approveEndDate = signal('');
  protected readonly forwardTargetPermissionId = signal('');
  protected readonly forwardNote = signal('');
  protected readonly requestDocsNote = signal('');
  protected readonly replyResetVersion = signal(0);
  protected readonly watcherResetVersion = signal(0);
  protected readonly sendingMessage = signal(false);
  protected readonly addingWatcher = signal(false);
  protected readonly removingWatcherId = signal<string | null>(null);
  protected readonly actionError = signal<ApiError | null>(null);
  protected readonly messageError = signal<ApiError | null>(null);

  protected readonly canDecide = computed(() => this.proposal()?.status === 'PENDING');
  protected readonly approveReady = computed(
    () =>
      this.approvePurpose().trim().length > 0 &&
      this.approveBeginDate().length > 0 &&
      this.approveEndDate().length > 0,
  );
  protected readonly forwardTargetLabel = computed(
    () =>
      this.staffOptions().find((o) => o.permissionId === this.forwardTargetPermissionId())?.label ??
      'the selected staff member',
  );

  protected asWorkflowStatus(value: string): WorkflowStatus {
    return value as WorkflowStatus;
  }

  protected selectPanel(panel: MyDetailPanel): void {
    this.activePanel.set(panel);
  }

  protected openRejectModal(): void {
    this.rejectionReason.set('');
    this.acceptConfirmOpen.set(false);
    this.actionError.set(null);
    this.rejectModalOpen.set(true);
  }

  protected closeRejectModal(): void {
    this.rejectModalOpen.set(false);
  }

  protected onRejectionReasonInput(event: Event): void {
    this.rejectionReason.set((event.target as HTMLTextAreaElement).value);
  }

  protected openForwardModal(): void {
    this.forwardTargetPermissionId.set('');
    this.forwardNote.set('');
    this.actionError.set(null);
    this.forwardModalOpen.set(true);
  }

  protected closeForwardModal(): void {
    this.forwardModalOpen.set(false);
  }

  protected onForwardTargetChange(event: Event): void {
    this.forwardTargetPermissionId.set((event.target as HTMLSelectElement).value);
  }

  protected onForwardNoteChange(event: Event): void {
    this.forwardNote.set((event.target as HTMLTextAreaElement).value);
  }

  protected async forward(): Promise<void> {
    const targetPermissionId = this.forwardTargetPermissionId();
    if (!targetPermissionId || this.forwarding()) return;

    this.forwarding.set(true);
    this.actionError.set(null);

    try {
      await firstValueFrom(
        this.proposalService.forwardProposal(this.id(), { targetPermissionId, note: this.forwardNote() }),
      );
      this.forwardModalOpen.set(false);
      this.proposalResource.reload();
      this.eventsResource.reload();
    } catch (err) {
      this.actionError.set(toApiError(err));
    } finally {
      this.forwarding.set(false);
    }
  }

  protected openRequestDocsModal(): void {
    this.requestDocsNote.set('');
    this.actionError.set(null);
    this.requestDocsModalOpen.set(true);
  }

  protected closeRequestDocsModal(): void {
    this.requestDocsModalOpen.set(false);
  }

  protected onRequestDocsNoteChange(event: Event): void {
    this.requestDocsNote.set((event.target as HTMLTextAreaElement).value);
  }

  protected async requestDocuments(): Promise<void> {
    if (this.requestingDocs()) return;

    this.requestingDocs.set(true);
    this.actionError.set(null);

    try {
      await firstValueFrom(
        this.proposalService.requestDocuments(this.id(), { note: this.requestDocsNote() }),
      );
      this.requestDocsModalOpen.set(false);
      this.eventsResource.reload();
    } catch (err) {
      this.actionError.set(toApiError(err));
    } finally {
      this.requestingDocs.set(false);
    }
  }

  protected async sendReply(payload: ReplyComposerPayload): Promise<void> {
    if (this.sendingMessage()) return;

    this.sendingMessage.set(true);
    this.messageError.set(null);

    try {
      const uploadedDocuments = [];
      for (const file of payload.files) {
        uploadedDocuments.push(
          await firstValueFrom(
            this.proposalService.uploadDocument(this.id(), file, 'STAFF_RESPONSE_ATTACHMENT'),
          ),
        );
      }

      await firstValueFrom(
        this.proposalService.sendMessage(this.id(), {
          recipient: this.proposal()?.requestedBy.user.email ?? '',
          subject: `Response to ${this.proposal()?.referenceNumber ?? 'proposal'}`,
          body: payload.body,
          documentIds: uploadedDocuments.map((document) => document.id),
        }),
      );

      this.replyResetVersion.update((version) => version + 1);
      this.proposalResource.reload();
      this.conversationResource.reload();
      this.eventsResource.reload();
    } catch (err) {
      this.messageError.set(toApiError(err));
    } finally {
      this.sendingMessage.set(false);
    }
  }

  protected async addWatcher(permissionId: string): Promise<void> {
    if (!permissionId || this.addingWatcher()) return;

    this.addingWatcher.set(true);
    this.actionError.set(null);

    try {
      await firstValueFrom(this.proposalService.addWatcher(this.id(), { permissionId }));
      this.watcherResetVersion.update((version) => version + 1);
      this.proposalResource.reload();
    } catch (err) {
      this.actionError.set(toApiError(err));
    } finally {
      this.addingWatcher.set(false);
    }
  }

  protected async removeWatcher(permissionId: string): Promise<void> {
    if (this.removingWatcherId()) return;

    this.removingWatcherId.set(permissionId);
    this.actionError.set(null);

    try {
      await firstValueFrom(this.proposalService.removeWatcher(this.id(), permissionId));
      this.proposalResource.reload();
    } catch (err) {
      this.actionError.set(toApiError(err));
    } finally {
      this.removingWatcherId.set(null);
    }
  }

  protected requestAcceptConfirmation(): void {
    if (this.accepting() || this.rejecting()) return;
    this.approvePurpose.set('');
    this.approveBeginDate.set('');
    this.approveEndDate.set('');
    this.actionError.set(null);
    this.acceptConfirmOpen.set(true);
  }

  protected cancelAcceptConfirmation(): void {
    this.acceptConfirmOpen.set(false);
  }

  protected onApprovePurposeInput(event: Event): void {
    this.approvePurpose.set((event.target as HTMLTextAreaElement).value);
  }

  protected onApproveBeginDateInput(event: Event): void {
    this.approveBeginDate.set((event.target as HTMLInputElement).value);
  }

  protected onApproveEndDateInput(event: Event): void {
    this.approveEndDate.set((event.target as HTMLInputElement).value);
  }

  protected async accept(): Promise<void> {
    if (this.accepting() || this.rejecting() || !this.approveReady()) return;

    this.accepting.set(true);
    this.actionError.set(null);

    try {
      await firstValueFrom(
        this.proposalService.approveProposal(this.id(), {
          title: this.proposal()?.collectionUseProject?.title ?? '',
          purpose: this.approvePurpose().trim(),
          beginDate: this.approveBeginDate(),
          endDate: this.approveEndDate(),
          note: 'Accepted from my assignment detail.',
        }),
      );
      await this.router.navigate(['/p/collections/proposals/approved']);
    } catch (err) {
      this.actionError.set(toApiError(err));
      this.acceptConfirmOpen.set(false);
    } finally {
      this.accepting.set(false);
    }
  }

  protected async reject(): Promise<void> {
    const reason = this.rejectionReason().trim();
    if (!reason || this.rejecting() || this.accepting()) return;

    this.rejecting.set(true);
    this.actionError.set(null);

    try {
      await firstValueFrom(this.proposalService.rejectProposal(this.id(), { reason }));
      await this.router.navigate(['/p/collections/proposals/rejected']);
    } catch (err) {
      this.actionError.set(toApiError(err));
      this.rejectModalOpen.set(false);
    } finally {
      this.rejecting.set(false);
    }
  }
}
