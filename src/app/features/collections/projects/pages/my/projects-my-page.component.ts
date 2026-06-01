import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { firstValueFrom } from 'rxjs';

import { ApiError, toApiError } from '@core/http/api-error.model';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { UseType } from '@shared/models/collection-use-status.model';

import { CollectionUseProjectSummary } from '../../models/project.model';
import { PROJECT_API_SERVICE } from '../../services/project-api.service';

const PAGE_SIZE = 3;
const CONCLUDE_NOTE = 'Concluded from my projects.';
const CANCEL_REASON = 'Cancelled from my projects.';

const TYPE_LABELS: Record<UseType, string> = {
  EXHIBITION: 'Exhibition',
  RESEARCH: 'Research',
  OTHER: 'Other',
};

@Component({
  selector: 'app-projects-my-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Menu,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorMessageComponent,
    EmptyStateComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './projects-my-page.component.html',
  styleUrl: './projects-my-page.component.scss',
})
export class ProjectsMyPageComponent {
  private readonly projectService = inject(PROJECT_API_SERVICE);
  private readonly router = inject(Router);

  protected readonly currentPage = signal(0);
  protected readonly searchDraft = signal('');
  protected readonly appliedSearch = signal('');
  protected readonly pageSize = PAGE_SIZE;

  protected readonly projectsResource = resource({
    params: () => ({
      page: this.currentPage(),
      size: this.pageSize,
      search: this.appliedSearch().trim(),
    }),
    loader: ({ params }) =>
      firstValueFrom(
        this.projectService.listProjects({
          status: 'IN_PROGRESS',
          ...params,
        }),
      ),
  });

  protected readonly projects = computed(() => this.projectsResource.value()?.content ?? []);
  protected readonly totalProjects = computed(
    () => this.projectsResource.value()?.totalElements ?? 0,
  );
  protected readonly totalPages = computed(() => this.projectsResource.value()?.totalPages ?? 0);
  protected readonly rangeStart = computed(() =>
    this.totalProjects() === 0 ? 0 : this.currentPage() * this.pageSize + 1,
  );
  protected readonly rangeEnd = computed(() =>
    Math.min((this.currentPage() + 1) * this.pageSize, this.totalProjects()),
  );
  protected readonly listError = computed(() => {
    const err = this.projectsResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly actionProjectId = signal<string | null>(null);
  protected readonly actionError = signal<ApiError | null>(null);
  protected readonly actionsMenuId = signal<string | null>(null);
  protected readonly concludeConfirmProjectId = signal<string | null>(null);
  protected readonly cancelConfirmProjectId = signal<string | null>(null);
  protected readonly cardActionItems = computed<MenuItem[]>(() => {
    const projectId = this.actionsMenuId();

    if (!projectId) return [];

    return [
      {
        label: 'View',
        icon: 'pi pi-eye',
        command: () => {
          void this.router.navigateByUrl(`/p/collections/projects/${projectId}`);
        },
      },
      {
        label: 'Conclude',
        icon: 'pi pi-check',
        command: () => this.requestConcludeConfirmation(projectId),
      },
      {
        label: 'Cancel',
        icon: 'pi pi-times',
        command: () => this.requestCancelConfirmation(projectId),
      },
    ];
  });
  protected readonly typeLabels = TYPE_LABELS;

  protected requesterLabel(project: CollectionUseProjectSummary): string {
    return project.requestedBy?.user.name ?? 'Unknown requester';
  }

  protected requesterEmail(project: CollectionUseProjectSummary): string {
    return project.requestedBy?.user.email ?? '';
  }

  protected assigneeLabel(project: CollectionUseProjectSummary): string {
    return project.proposal.assignedTo?.user.name ?? 'Unassigned';
  }

  protected assigneeEmail(project: CollectionUseProjectSummary): string {
    return project.proposal.assignedTo?.user.email ?? '';
  }

  protected dateLabel(date: string): string {
    return date.slice(0, 10);
  }

  protected onSearchInput(event: Event): void {
    this.searchDraft.set((event.target as HTMLInputElement).value);
  }

  protected applySearch(): void {
    this.appliedSearch.set(this.searchDraft().trim());
    this.currentPage.set(0);
  }

  protected clearSearch(): void {
    this.searchDraft.set('');
    this.appliedSearch.set('');
    this.currentPage.set(0);
  }

  protected firstPage(): void {
    this.currentPage.set(0);
  }

  protected prevPage(): void {
    this.currentPage.update((page) => Math.max(0, page - 1));
  }

  protected nextPage(): void {
    this.currentPage.update((page) => Math.min(Math.max(0, this.totalPages() - 1), page + 1));
  }

  protected lastPage(): void {
    this.currentPage.set(Math.max(0, this.totalPages() - 1));
  }

  protected log(project: CollectionUseProjectSummary): void {
    const logType = project.type.toLowerCase();
    void this.router.navigateByUrl(`/p/collections/projects/${project.id}/log/${logType}`);
  }

  protected toggleActionsMenu(projectId: string): void {
    this.actionsMenuId.update((current) => (current === projectId ? null : projectId));
    this.concludeConfirmProjectId.set(null);
    this.cancelConfirmProjectId.set(null);
  }

  protected closeActionsMenu(): void {
    this.actionsMenuId.set(null);
  }

  protected requestConcludeConfirmation(projectId: string): void {
    if (this.actionProjectId()) return;
    this.actionsMenuId.set(null);
    this.cancelConfirmProjectId.set(null);
    this.concludeConfirmProjectId.set(projectId);
  }

  protected cancelConcludeConfirmation(): void {
    this.concludeConfirmProjectId.set(null);
  }

  protected requestCancelConfirmation(projectId: string): void {
    if (this.actionProjectId()) return;
    this.actionsMenuId.set(null);
    this.concludeConfirmProjectId.set(null);
    this.cancelConfirmProjectId.set(projectId);
  }

  protected cancelCancelConfirmation(): void {
    this.cancelConfirmProjectId.set(null);
  }

  protected async conclude(projectId: string): Promise<void> {
    if (this.actionProjectId()) return;
    this.actionsMenuId.set(null);
    this.actionProjectId.set(projectId);
    this.actionError.set(null);

    try {
      await firstValueFrom(this.projectService.completeProject(projectId, { note: CONCLUDE_NOTE }));
      this.concludeConfirmProjectId.set(null);
      this.projectsResource.reload();
    } catch (err) {
      this.actionError.set(toApiError(err));
      this.concludeConfirmProjectId.set(null);
    } finally {
      this.actionProjectId.set(null);
    }
  }

  protected async cancel(projectId: string): Promise<void> {
    if (this.actionProjectId()) return;
    this.actionsMenuId.set(null);
    this.actionProjectId.set(projectId);
    this.actionError.set(null);

    try {
      await firstValueFrom(this.projectService.cancelProject(projectId, { reason: CANCEL_REASON }));
      this.cancelConfirmProjectId.set(null);
      this.projectsResource.reload();
    } catch (err) {
      this.actionError.set(toApiError(err));
      this.cancelConfirmProjectId.set(null);
    } finally {
      this.actionProjectId.set(null);
    }
  }
}
