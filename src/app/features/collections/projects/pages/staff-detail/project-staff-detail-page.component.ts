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
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import {
  StatusChipComponent,
  WorkflowStatus,
} from '@shared/components/status-chip/status-chip.component';
import { TypeChipComponent } from '@shared/components/type-chip/type-chip.component';
import { UseType } from '@shared/models/collection-use-status.model';

import { PROJECT_API_SERVICE } from '../../services/project-api.service';

type StaffProjectPanel = 'overview' | 'tasks';

const LOG_ROUTE_SEGMENTS: Record<UseType, string> = {
  EXHIBITION: 'exhibition',
  IN_SITU_VISIT: 'research',
  OTHER: 'other',
};

function safeReturnTo(value: string | undefined): string {
  return value?.startsWith('/p/collections') ? value : '/p/collections/projects/my';
}

function safeReturnLabel(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : 'my projects';
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

@Component({
  selector: 'app-project-staff-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LoadingStateComponent,
    ErrorMessageComponent,
    StatusChipComponent,
    TypeChipComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './project-staff-detail-page.component.html',
  styleUrl: './project-staff-detail-page.component.scss',
})
export class ProjectStaffDetailPageComponent {
  private readonly projectService = inject(PROJECT_API_SERVICE);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly returnTo = input<string>();
  readonly returnLabel = input<string>();
  readonly sectionLabel = input('Staff');

  protected readonly backLink = computed(() => safeReturnTo(this.returnTo()));
  protected readonly backLabel = computed(() => `Back to ${safeReturnLabel(this.returnLabel())}`);
  protected readonly taskEyebrow = computed(() => `${this.sectionLabel()} task`);
  protected readonly cancelReason = computed(
    () => `Cancelled from ${this.sectionLabel().toLowerCase()} project detail.`,
  );

  protected readonly projectResource = resource({
    params: () => this.id(),
    loader: ({ params }) => firstValueFrom(this.projectService.getProject(params)),
  });

  protected readonly eventsResource = resource({
    params: () => this.id(),
    loader: ({ params }) => firstValueFrom(this.projectService.listEvents(params)),
  });

  protected readonly project = computed(() => this.projectResource.value() ?? null);
  protected readonly events = computed(() => this.eventsResource.value()?.content ?? []);
  protected readonly projectError = computed<ApiError | null>(() => {
    const err = this.projectResource.error();
    return err ? toApiError(err) : null;
  });
  protected readonly canCancel = computed(() => {
    const project = this.project();
    if (!project) return false;

    return (
      project.actions?.canCancel ??
      (project.status === 'CREATED' || project.status === 'IN_PROGRESS')
    );
  });
  protected readonly canOpenLogTasks = computed(() => this.project()?.status === 'IN_PROGRESS');
  // Staff write publication entries once COMPLETED; the log stays readable in
  // both phases, so surface the task for IN_PROGRESS and COMPLETED projects.
  protected readonly canOpenPublication = computed(() => {
    const status = this.project()?.status;
    return status === 'IN_PROGRESS' || status === 'COMPLETED';
  });
  protected readonly logRouteSegment = computed(() => {
    const type = this.project()?.type;
    return type ? LOG_ROUTE_SEGMENTS[type] : 'research';
  });

  protected readonly activePanel = signal<StaffProjectPanel>('overview');
  protected readonly acting = signal(false);
  protected readonly actionError = signal<ApiError | null>(null);
  protected readonly cancelConfirmOpen = signal(false);

  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;

  protected asWorkflowStatus(value: string): WorkflowStatus {
    return value as WorkflowStatus;
  }

  protected selectPanel(panel: StaffProjectPanel): void {
    this.activePanel.set(panel);
  }

  protected openCancelConfirm(): void {
    if (!this.canCancel()) return;
    this.actionError.set(null);
    this.cancelConfirmOpen.set(true);
  }

  protected closeCancelConfirm(): void {
    this.cancelConfirmOpen.set(false);
  }

  protected async cancel(): Promise<void> {
    if (this.acting() || !this.canCancel()) return;

    this.acting.set(true);
    this.actionError.set(null);

    try {
      await firstValueFrom(
        this.projectService.cancelProject(this.id(), { reason: this.cancelReason() }),
      );
      await this.router.navigate(['/p/collections/projects/cancelled']);
    } catch (err) {
      this.actionError.set(toApiError(err));
    } finally {
      this.cancelConfirmOpen.set(false);
      this.acting.set(false);
    }
  }
}
