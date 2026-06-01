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

import { ApiError, toApiError } from '@core/http/api-error.model';
import { GroupName } from '@core/auth/models/group-name.enum';
import { USER_MANAGEMENT_SERVICE } from '@features/admin/services/user-management.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { UseType } from '@shared/models/collection-use-status.model';

import {
  ProposalForwardModalComponent,
  ProposalForwardStaffOption,
} from '../../components/proposal-forward-modal/proposal-forward-modal.component';
import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

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

@Component({
  selector: 'app-proposals-new-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Menu,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorMessageComponent,
    EmptyStateComponent,
    ProposalForwardModalComponent,
  ],
  templateUrl: './proposals-new-page.component.html',
  styleUrl: './proposals-new-page.component.scss',
})
export class ProposalsNewPageComponent {
  private readonly proposalService = inject(PROPOSAL_API_SERVICE);
  private readonly userService = inject(USER_MANAGEMENT_SERVICE);
  private readonly router = inject(Router);

  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly searchDraft = signal('');
  protected readonly appliedSearch = signal('');

  protected readonly proposalsResource = resource({
    params: () => ({
      page: this.currentPage(),
      size: this.pageSize(),
      search: this.appliedSearch().trim(),
    }),
    loader: ({ params }) =>
      firstValueFrom(
        this.proposalService.listProposals({ status: 'SUBMITTED', unassigned: true, ...params }),
      ),
  });

  protected readonly staffUsersResource = resource({
    loader: () => firstValueFrom(this.userService.listUsers({ size: 100 })),
  });

  protected readonly proposals = computed(() => this.proposalsResource.value()?.content ?? []);
  protected readonly totalProposals = computed(
    () => this.proposalsResource.value()?.totalElements ?? 0,
  );
  protected readonly totalPages = computed(() => this.proposalsResource.value()?.totalPages ?? 0);
  protected readonly rangeStart = computed(() => this.currentPage() * this.pageSize() + 1);
  protected readonly rangeEnd = computed(() =>
    Math.min((this.currentPage() + 1) * this.pageSize(), this.totalProposals()),
  );
  protected readonly listError = computed(() => {
    const err = this.proposalsResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly staffOptions = computed<ProposalForwardStaffOption[]>(() =>
    (this.staffUsersResource.value()?.content ?? []).flatMap((u) =>
      u.permissions
        .filter((p) => p.group.name !== 'EXTERNAL')
        .map((p) => ({
          label: `${u.name} — ${GROUP_LABELS[p.group.name]}`,
          permissionId: p.permissionId,
        })),
    ),
  );

  protected readonly typeLabels = TYPE_LABELS;
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  protected readonly assumingId = signal<string | null>(null);
  protected readonly assumeError = signal<ApiError | null>(null);
  protected readonly actionsMenuId = signal<string | null>(null);
  protected readonly rowActionItems = computed<MenuItem[]>(() => {
    const proposalId = this.actionsMenuId();

    if (!proposalId) return [];

    return [
      {
        label: 'Forward',
        icon: 'pi pi-send',
        command: () => this.openForwardModal(proposalId),
      },
      {
        label: 'View details',
        icon: 'pi pi-eye',
        command: () => {
          void this.router.navigate(['/p/collections/proposals', proposalId], {
            queryParams: {
              returnTo: '/p/collections/proposals/new',
              returnLabel: 'new proposals',
            },
          });
        },
      },
    ];
  });

  protected readonly forwardModalProposalId = signal<string | null>(null);
  protected readonly forwardModalProposal = computed(() => {
    const proposalId = this.forwardModalProposalId();
    return this.proposals().find((proposal) => proposal.id === proposalId) ?? null;
  });
  protected readonly forwardTargetPermissionId = signal('');
  protected readonly forwardNote = signal('');
  protected readonly forwardPending = signal(false);
  protected readonly forwardError = signal<ApiError | null>(null);

  protected prevPage(): void {
    this.currentPage.update((p) => Math.max(0, p - 1));
  }

  protected nextPage(): void {
    this.currentPage.update((p) => Math.min(Math.max(0, this.totalPages() - 1), p + 1));
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

  protected async assume(proposalId: string): Promise<void> {
    if (this.assumingId()) return;
    this.actionsMenuId.set(null);
    this.assumingId.set(proposalId);
    this.assumeError.set(null);
    try {
      await firstValueFrom(this.proposalService.assignProposal(proposalId, { note: '' }));
      this.proposalsResource.reload();
    } catch (err) {
      this.assumeError.set(toApiError(err));
    } finally {
      this.assumingId.set(null);
    }
  }

  protected openForwardModal(proposalId: string): void {
    this.actionsMenuId.set(null);
    this.forwardModalProposalId.set(proposalId);
    this.forwardTargetPermissionId.set('');
    this.forwardNote.set('');
    this.forwardError.set(null);
  }

  protected closeForwardModal(): void {
    this.forwardModalProposalId.set(null);
  }

  protected toggleActionsMenu(proposalId: string): void {
    this.actionsMenuId.update((current) => (current === proposalId ? null : proposalId));
    this.forwardModalProposalId.set(null);
  }

  protected closeActionsMenu(): void {
    this.actionsMenuId.set(null);
  }

  protected onForwardTargetChange(event: Event): void {
    this.forwardTargetPermissionId.set((event.target as HTMLSelectElement).value);
  }

  protected onForwardNoteChange(event: Event): void {
    this.forwardNote.set((event.target as HTMLTextAreaElement).value);
  }

  protected async forward(proposalId: string): Promise<void> {
    const targetPermissionId = this.forwardTargetPermissionId();
    if (!targetPermissionId || this.forwardPending()) return;
    this.forwardPending.set(true);
    this.forwardError.set(null);
    try {
      await firstValueFrom(
        this.proposalService.forwardProposal(proposalId, {
          targetPermissionId,
          note: this.forwardNote(),
        }),
      );
      this.forwardModalProposalId.set(null);
      this.proposalsResource.reload();
    } catch (err) {
      this.forwardError.set(toApiError(err));
    } finally {
      this.forwardPending.set(false);
    }
  }
}
