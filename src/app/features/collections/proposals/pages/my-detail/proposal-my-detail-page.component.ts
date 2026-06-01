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

import { GroupName } from '@core/auth/models/group-name.enum';
import { ApiError, toApiError } from '@core/http/api-error.model';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import {
  StatusChipComponent,
  WorkflowStatus,
} from '@shared/components/status-chip/status-chip.component';
import { UseType } from '@shared/models/collection-use-status.model';

import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';

const TYPE_LABELS: Record<UseType, string> = {
  EXHIBITION: 'Exhibition',
  RESEARCH: 'Research',
  OTHER: 'Other',
};

const GROUP_LABELS: Record<GroupName, string> = {
  EXTERNAL: 'External',
  COLLECTIONS_MANAGEMENT: 'Collections management',
  CURATORIAL: 'Curatorial',
  DIRECTION: 'Direction',
  ADMINISTRATION: 'Administration',
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

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
  ],
  templateUrl: './proposal-my-detail-page.component.html',
  styleUrl: './proposal-my-detail-page.component.scss',
})
export class ProposalMyDetailPageComponent {
  private readonly proposalService = inject(PROPOSAL_API_SERVICE);
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

  protected readonly proposal = computed(() => this.proposalResource.value() ?? null);
  protected readonly messages = computed(() => this.conversationResource.value()?.messages ?? []);
  protected readonly events = computed(() => this.eventsResource.value()?.content ?? []);
  protected readonly watchers = computed(() => this.proposal()?.watchers ?? []);
  protected readonly proposalError = computed<ApiError | null>(() => {
    const err = this.proposalResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly typeLabels = TYPE_LABELS;
  protected readonly groupLabels = GROUP_LABELS;
  protected readonly formatDateTime = formatDateTime;
  protected readonly accepting = signal(false);
  protected readonly rejecting = signal(false);
  protected readonly acceptConfirmOpen = signal(false);
  protected readonly rejectConfirmOpen = signal(false);
  protected readonly rejectPanelOpen = signal(false);
  protected readonly rejectionReason = signal('');
  protected readonly actionError = signal<ApiError | null>(null);

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
