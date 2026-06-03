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
import { UseType } from '@shared/models/collection-use-status.model';

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

const TYPE_LABELS: Record<UseType, string> = {
  EXHIBITION: 'Exhibition',
  RESEARCH: 'Research',
  OTHER: 'Other',
};

@Component({
  selector: 'app-proposal-my-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LoadingStateComponent,
    ErrorMessageComponent,
    StatusChipComponent,
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

  protected readonly typeLabels = TYPE_LABELS;
  protected readonly accepting = signal(false);
  protected readonly rejecting = signal(false);
  protected readonly acceptConfirmOpen = signal(false);
  protected readonly rejectConfirmOpen = signal(false);
  protected readonly rejectPanelOpen = signal(false);
  protected readonly rejectionReason = signal('');
  protected readonly replyResetVersion = signal(0);
  protected readonly watcherResetVersion = signal(0);
  protected readonly sendingMessage = signal(false);
  protected readonly addingWatcher = signal(false);
  protected readonly removingWatcherId = signal<string | null>(null);
  protected readonly actionError = signal<ApiError | null>(null);
  protected readonly messageError = signal<ApiError | null>(null);

  protected asWorkflowStatus(value: string): WorkflowStatus {
    return value as WorkflowStatus;
  }

  protected openRejectPanel(): void {
    this.rejectPanelOpen.set(true);
    this.acceptConfirmOpen.set(false);
    this.actionError.set(null);
  }

  protected closeRejectPanel(): void {
    this.rejectPanelOpen.set(false);
    this.rejectConfirmOpen.set(false);
    this.rejectionReason.set('');
  }

  protected onRejectionReasonInput(event: Event): void {
    this.rejectionReason.set((event.target as HTMLTextAreaElement).value);
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
          subject: `Response to ${this.proposal()?.collectionUseProject.referenceNumber ?? 'proposal'}`,
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
    this.acceptConfirmOpen.set(true);
  }

  protected cancelAcceptConfirmation(): void {
    this.acceptConfirmOpen.set(false);
  }

  protected requestRejectConfirmation(): void {
    if (!this.rejectionReason().trim() || this.accepting() || this.rejecting()) return;
    this.rejectConfirmOpen.set(true);
  }

  protected cancelRejectConfirmation(): void {
    this.rejectConfirmOpen.set(false);
  }

  protected async accept(): Promise<void> {
    if (this.accepting() || this.rejecting()) return;

    this.accepting.set(true);
    this.actionError.set(null);

    try {
      await firstValueFrom(
        this.proposalService.approveProposal(this.id(), {
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
      this.rejectConfirmOpen.set(false);
    } finally {
      this.rejecting.set(false);
    }
  }
}
