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
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusChipComponent } from '@shared/components/status-chip/status-chip.component';

import { VisitsInSituReportRow } from '../../models/report.model';
import { REPORTS_API_SERVICE } from '../../services/reports-api.service';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

@Component({
  selector: 'app-visits-in-situ-report-page',
  standalone: true,
  imports: [
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorMessageComponent,
    EmptyStateComponent,
    StatusChipComponent,
  ],
  templateUrl: './visits-in-situ-report-page.component.html',
  styleUrl: './visits-in-situ-report-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisitsInSituReportPageComponent {
  private readonly reportsService = inject(REPORTS_API_SERVICE);

  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly searchDraft = signal('');
  protected readonly appliedSearch = signal('');

  protected readonly reportResource = resource({
    params: () => ({
      page: this.currentPage(),
      size: this.pageSize(),
      search: this.appliedSearch().trim(),
    }),
    loader: ({ params }) =>
      firstValueFrom(
        this.reportsService.listVisitsInSitu({
          page: params.page,
          size: params.size,
          search: params.search,
        }),
      ),
  });

  protected readonly rows = computed(() => this.reportResource.value()?.content ?? []);
  protected readonly totalRows = computed(() => this.reportResource.value()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.reportResource.value()?.totalPages ?? 0);
  protected readonly rangeStart = computed(() =>
    this.totalRows() === 0 ? 0 : this.currentPage() * this.pageSize() + 1,
  );
  protected readonly rangeEnd = computed(() =>
    Math.min((this.currentPage() + 1) * this.pageSize(), this.totalRows()),
  );
  protected readonly listError = computed<ApiError | null>(() => {
    const err = this.reportResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  protected requesterLabel(row: VisitsInSituReportRow): string {
    return row.requestedBy.user.name;
  }

  protected requesterEmail(row: VisitsInSituReportRow): string {
    return row.requestedBy.user.email;
  }

  protected assigneeLabel(row: VisitsInSituReportRow): string {
    return row.assignedTo?.user.name ?? 'Unassigned';
  }

  protected assigneeEmail(row: VisitsInSituReportRow): string {
    return row.assignedTo?.user.email ?? '';
  }

  protected dateLabel(date: string | null): string {
    return date ? date.slice(0, 10) : 'Not recorded';
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
}
