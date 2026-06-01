import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { GroupName } from '@core/auth/models/group-name.enum';
import { ApiError, toApiError } from '@core/http/api-error.model';
import { USER_MANAGEMENT_SERVICE } from '@features/admin/services/user-management.service';
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

interface StaffOption {
  readonly label: string;
  readonly permissionId: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

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

function safeReturnTo(value: string | undefined): string {
  return value?.startsWith('/p/collections/proposals')
    ? value
    : '/p/collections/proposals/new';
}

function safeReturnLabel(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : 'new proposals';
}

@Component({
  selector: 'app-proposal-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoadingStateComponent, ErrorMessageComponent, StatusChipComponent],
  templateUrl: './proposal-detail-page.component.html',
  styleUrl: './proposal-detail-page.component.scss',
})
export class ProposalDetailPageComponent {
  private readonly proposalService = inject(PROPOSAL_API_SERVICE);
  private readonly userService = inject(USER_MANAGEMENT_SERVICE);

  readonly id = input.required<string>();
  readonly returnTo = input<string>();
  readonly returnLabel = input<string>();

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
  protected readonly backLink = computed(() => safeReturnTo(this.returnTo()));
  protected readonly backLabel = computed(() => `Back to ${safeReturnLabel(this.returnLabel())}`);
  protected readonly messages = computed(() => this.conversationResource.value()?.messages ?? []);
  protected readonly events = computed(() => this.eventsResource.value()?.content ?? []);
  protected readonly watchers = computed(() => this.proposal()?.watchers ?? []);
  protected readonly canAssign = computed(() => {
    const proposal = this.proposal();
    return proposal?.status === 'SUBMITTED' && proposal.assignedTo === null;
  });
  protected readonly staffOptions = computed<StaffOption[]>(() =>
    (this.staffUsersResource.value()?.content ?? []).flatMap((u) =>
      u.permissions
        .filter((p) => p.group.name !== 'EXTERNAL')
        .map((p) => ({
          label: `${u.name} — ${GROUP_LABELS[p.group.name]}`,
          permissionId: p.permissionId,
        })),
    ),
  );
  protected readonly watcherOptions = computed<StaffOption[]>(() => {
    const watcherIds = new Set(this.watchers().map((watcher) => watcher.permissionId));
    return this.staffOptions().filter((option) => !watcherIds.has(option.permissionId));
  });

  protected readonly proposalError = computed(() => {
    const err = this.proposalResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly typeLabels = TYPE_LABELS;
  protected readonly groupLabels = GROUP_LABELS;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly assuming = signal(false);
  protected readonly forwarding = signal(false);
  protected readonly forwardPanelOpen = signal(false);
  protected readonly forwardTargetPermissionId = signal('');
  protected readonly forwardNote = signal('');
  protected readonly watcherPermissionId = signal('');
  protected readonly addingWatcher = signal(false);
  protected readonly removingWatcherId = signal<string | null>(null);
  protected readonly actionError = signal<ApiError | null>(null);

  protected asWorkflowStatus(value: string): WorkflowStatus {
    return value as WorkflowStatus;
  }

  protected async assume(): Promise<void> {
    if (!this.canAssign() || this.assuming()) return;

    this.assuming.set(true);
    this.actionError.set(null);

    try {
      await firstValueFrom(
        this.proposalService.assignProposal(this.id(), { note: 'Assumed from proposal detail.' }),
      );
      this.reloadWorkflow();
    } catch (err) {
      this.actionError.set(toApiError(err));
    } finally {
      this.assuming.set(false);
    }
  }

  protected openForwardPanel(): void {
    this.forwardPanelOpen.set(true);
    this.actionError.set(null);
  }

  protected closeForwardPanel(): void {
    this.forwardPanelOpen.set(false);
    this.forwardTargetPermissionId.set('');
    this.forwardNote.set('');
  }

  protected onForwardTargetChange(event: Event): void {
    this.forwardTargetPermissionId.set((event.target as HTMLSelectElement).value);
  }

  protected onForwardNoteChange(event: Event): void {
    this.forwardNote.set((event.target as HTMLTextAreaElement).value);
  }

  protected onWatcherPermissionChange(event: Event): void {
    this.watcherPermissionId.set((event.target as HTMLSelectElement).value);
  }

  protected async forward(): Promise<void> {
    const targetPermissionId = this.forwardTargetPermissionId();
    if (!this.canAssign() || !targetPermissionId || this.forwarding()) return;

    this.forwarding.set(true);
    this.actionError.set(null);

    try {
      await firstValueFrom(
        this.proposalService.forwardProposal(this.id(), {
          targetPermissionId,
          note: this.forwardNote(),
        }),
      );
      this.closeForwardPanel();
      this.reloadWorkflow();
    } catch (err) {
      this.actionError.set(toApiError(err));
    } finally {
      this.forwarding.set(false);
    }
  }

  protected async addWatcher(): Promise<void> {
    const permissionId = this.watcherPermissionId();
    if (!permissionId || this.addingWatcher()) return;

    this.addingWatcher.set(true);
    this.actionError.set(null);

    try {
      await firstValueFrom(this.proposalService.addWatcher(this.id(), { permissionId }));
      this.watcherPermissionId.set('');
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

  private reloadWorkflow(): void {
    this.proposalResource.reload();
    this.eventsResource.reload();
  }
}
