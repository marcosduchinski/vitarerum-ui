import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ApiError, toApiError } from '@core/http/api-error.model';
import { GroupName } from '@core/auth/models/group-name.enum';
import { USER_MANAGEMENT_SERVICE } from '@features/admin/services/user-management.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { UseType } from '@shared/models/collection-use-status.model';

import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';

const PAGE_SIZE = 20;

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

@Component({
  selector: 'app-proposals-new-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorMessageComponent,
    EmptyStateComponent,
  ],
  templateUrl: './proposals-new-page.component.html',
  styleUrl: './proposals-new-page.component.scss',
})
export class ProposalsNewPageComponent {
  private readonly proposalService = inject(PROPOSAL_API_SERVICE);
  private readonly userService = inject(USER_MANAGEMENT_SERVICE);

  protected readonly currentPage = signal(0);

  protected readonly proposalsResource = resource({
    params: () => ({ page: this.currentPage(), size: PAGE_SIZE }),
    loader: ({ params }) =>
      firstValueFrom(this.proposalService.listProposals({ status: 'SUBMITTED', unassigned: true, ...params })),
  });

  protected readonly staffUsersResource = resource({
    loader: () => firstValueFrom(this.userService.listUsers({ size: 100 })),
  });

  protected readonly proposals = computed(() => this.proposalsResource.value()?.content ?? []);
  protected readonly totalProposals = computed(() => this.proposalsResource.value()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.proposalsResource.value()?.totalPages ?? 0);
  protected readonly rangeStart = computed(() => this.currentPage() * PAGE_SIZE + 1);
  protected readonly rangeEnd = computed(() =>
    Math.min((this.currentPage() + 1) * PAGE_SIZE, this.totalProposals()),
  );
  protected readonly listError = computed(() => {
    const err = this.proposalsResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly staffOptions = computed<StaffOption[]>(() =>
    (this.staffUsersResource.value()?.content ?? []).flatMap(u =>
      u.permissions
        .filter(p => p.group.name !== 'EXTERNAL')
        .map(p => ({
          label: `${u.name} — ${GROUP_LABELS[p.group.name]}`,
          permissionId: p.permissionId,
        })),
    ),
  );

  protected readonly typeLabels = TYPE_LABELS;

  protected readonly assumingId = signal<string | null>(null);
  protected readonly assumeError = signal<ApiError | null>(null);

  protected readonly forwardPanelId = signal<string | null>(null);
  protected readonly forwardTargetPermissionId = signal('');
  protected readonly forwardNote = signal('');
  protected readonly forwardPending = signal(false);
  protected readonly forwardError = signal<ApiError | null>(null);

  protected prevPage(): void {
    this.currentPage.update(p => Math.max(0, p - 1));
  }

  protected nextPage(): void {
    this.currentPage.update(p => p + 1);
  }

  protected async assume(proposalId: string): Promise<void> {
    if (this.assumingId()) return;
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

  protected openForwardPanel(proposalId: string): void {
    this.forwardPanelId.set(proposalId);
    this.forwardTargetPermissionId.set('');
    this.forwardNote.set('');
    this.forwardError.set(null);
  }

  protected closeForwardPanel(): void {
    this.forwardPanelId.set(null);
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
        this.proposalService.assignProposal(proposalId, {
          targetPermissionId,
          note: this.forwardNote(),
        }),
      );
      this.forwardPanelId.set(null);
      this.proposalsResource.reload();
    } catch (err) {
      this.forwardError.set(toApiError(err));
    } finally {
      this.forwardPending.set(false);
    }
  }
}
