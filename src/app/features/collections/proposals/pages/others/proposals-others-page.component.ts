import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { firstValueFrom } from 'rxjs';

import { IDENTITY_SERVICE } from '@core/auth/identity.service';
import { ApiError, toApiError } from '@core/http/api-error.model';
import { USER_MANAGEMENT_SERVICE } from '@features/admin/services/user-management.service';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { UseType } from '@shared/models/collection-use-status.model';

import { ProposalSummary } from '../../models/proposal.model';
import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const ASSIGNMENTS_FETCH_SIZE = 500;

const TYPE_LABELS: Record<UseType, string> = {
  EXHIBITION: 'Exhibition',
  RESEARCH: 'Research',
  OTHER: 'Other',
};

@Component({
  selector: 'app-proposals-others-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Menu,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorMessageComponent,
    EmptyStateComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './proposals-others-page.component.html',
  styleUrl: './proposals-others-page.component.scss',
})
export class ProposalsOthersPageComponent {
  private readonly identity = inject(IDENTITY_SERVICE);
  private readonly proposalService = inject(PROPOSAL_API_SERVICE);
  private readonly userService = inject(USER_MANAGEMENT_SERVICE);
  private readonly router = inject(Router);

  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly searchDraft = signal('');
  protected readonly appliedSearch = signal('');

  protected readonly usersResource = resource({
    loader: () => firstValueFrom(this.userService.listUsers({ size: 100 })),
  });

  protected readonly currentPermissionId = computed(() => {
    const session = this.identity.session();
    if (!session) return null;

    const user = (this.usersResource.value()?.content ?? []).find(
      (candidate) => candidate.id === session.user.id || candidate.email === session.user.email,
    );

    return (
      user?.permissions.find((permission) => permission.group.name === session.group)
        ?.permissionId ?? null
    );
  });

  protected readonly proposalsResource = resource({
    params: () => ({
      search: this.appliedSearch().trim(),
      currentPermissionId: this.currentPermissionId(),
    }),
    loader: ({ params }) => {
      if (!params.currentPermissionId) return Promise.resolve<readonly ProposalSummary[]>([]);

      return firstValueFrom(
        this.proposalService.listProposals({
          page: 0,
          size: ASSIGNMENTS_FETCH_SIZE,
          search: params.search,
        }),
      ).then((page) =>
        page.content.filter(
          (proposal) =>
            proposal.assignedTo !== null &&
            proposal.assignedTo.permissionId !== params.currentPermissionId,
        ),
      );
    },
  });

  protected readonly proposals = computed(() => {
    const start = this.currentPage() * this.pageSize();
    return this.allOtherAssignments().slice(start, start + this.pageSize());
  });
  protected readonly totalProposals = computed(() => this.allOtherAssignments().length);
  protected readonly totalPages = computed(() => Math.ceil(this.totalProposals() / this.pageSize()));
  protected readonly rangeStart = computed(() =>
    this.totalProposals() === 0 ? 0 : this.currentPage() * this.pageSize() + 1,
  );
  protected readonly rangeEnd = computed(() =>
    Math.min((this.currentPage() + 1) * this.pageSize(), this.totalProposals()),
  );
  protected readonly listError = computed<ApiError | null>(() => {
    const err = this.proposalsResource.error() ?? this.usersResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly typeLabels = TYPE_LABELS;
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  protected readonly assumingId = signal<string | null>(null);
  protected readonly assumeConfirmProposalId = signal<string | null>(null);
  protected readonly assumeError = signal<ApiError | null>(null);
  protected readonly actionsMenuId = signal<string | null>(null);
  protected readonly rowActionItems = computed<MenuItem[]>(() => {
    const proposalId = this.actionsMenuId();

    if (!proposalId) return [];

    return [
      {
        label: 'Assume',
        icon: 'pi pi-user-plus',
        command: () => this.requestAssumeConfirmation(proposalId),
      },
      {
        label: 'View details',
        icon: 'pi pi-eye',
        command: () => {
          void this.router.navigate(['/p/collections/proposals', proposalId], {
            queryParams: {
              returnTo: '/p/collections/proposals/others',
              returnLabel: 'other assignments',
            },
          });
        },
      },
    ];
  });

  private readonly allOtherAssignments = computed(() => this.proposalsResource.value() ?? []);

  protected prevPage(): void {
    this.currentPage.update((page) => Math.max(0, page - 1));
  }

  protected nextPage(): void {
    this.currentPage.update((page) => Math.min(Math.max(0, this.totalPages() - 1), page + 1));
  }

  protected firstPage(): void {
    this.currentPage.set(0);
  }

  protected lastPage(): void {
    this.currentPage.set(Math.max(0, this.totalPages() - 1));
  }

  protected onPageSizeChange(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.currentPage.set(0);
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

  protected toggleActionsMenu(proposalId: string): void {
    this.actionsMenuId.update((current) => (current === proposalId ? null : proposalId));
    this.assumeConfirmProposalId.set(null);
  }

  protected closeActionsMenu(): void {
    this.actionsMenuId.set(null);
  }

  protected requestAssumeConfirmation(proposalId: string): void {
    if (this.assumingId()) return;
    this.actionsMenuId.set(null);
    this.assumeConfirmProposalId.set(proposalId);
  }

  protected cancelAssumeConfirmation(): void {
    this.assumeConfirmProposalId.set(null);
  }

  protected async assume(proposalId: string): Promise<void> {
    if (this.assumingId()) return;

    this.actionsMenuId.set(null);
    this.assumingId.set(proposalId);
    this.assumeError.set(null);

    try {
      await firstValueFrom(this.proposalService.assignProposal(proposalId, { note: '' }));
      this.assumeConfirmProposalId.set(null);
      this.proposalsResource.reload();
    } catch (err) {
      this.assumeError.set(toApiError(err));
      this.assumeConfirmProposalId.set(null);
    } finally {
      this.assumingId.set(null);
    }
  }
}
