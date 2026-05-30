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
import { InputText } from 'primeng/inputtext';
import { ButtonDirective } from 'primeng/button';
import { toApiError } from '@core/http/api-error.model';
import { USER_MANAGEMENT_SERVICE } from '@features/admin/services/user-management.service';
import { GroupName } from '@core/auth/models/group-name.enum';
import { UserDetail } from '@core/auth/models/user.model';
import { Page } from '@shared/models/page.model';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

const GROUP_LABELS: Record<GroupName, string> = {
  EXTERNAL: 'External researcher',
  COLLECTIONS_MANAGEMENT: 'Collections management',
  CURATORIAL: 'Curatorial',
  DIRECTION: 'Direction',
  ADMIN: 'Administrator',
};

const PAGE_SIZE = 20;

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [RouterLink, InputText, ButtonDirective, ErrorMessageComponent, LoadingStateComponent, EmptyStateComponent],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPageComponent {
  private readonly userService = inject(USER_MANAGEMENT_SERVICE);

  protected readonly searchQuery = signal('');
  protected readonly currentPage = signal(0);

  protected readonly usersResource = resource<Page<UserDetail>, { search?: string; page: number; size: number }>({
    params: () => ({
      search: this.searchQuery() || undefined,
      page: this.currentPage(),
      size: PAGE_SIZE,
    }),
    loader: ({ params }): Promise<Page<UserDetail>> => firstValueFrom(this.userService.listUsers(params)),
  });

  protected readonly apiError = computed(() => {
    const err = this.usersResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly users = computed(() => this.usersResource.value()?.content ?? []);
  protected readonly totalUsers = computed(() => this.usersResource.value()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.usersResource.value()?.totalPages ?? 0);

  protected readonly rangeStart = computed(() => this.currentPage() * PAGE_SIZE + 1);
  protected readonly rangeEnd = computed(() =>
    Math.min((this.currentPage() + 1) * PAGE_SIZE, this.totalUsers()),
  );

  protected readonly groupLabels = GROUP_LABELS;

  protected onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(0);
  }

  protected prevPage(): void {
    this.currentPage.update(p => Math.max(0, p - 1));
  }

  protected nextPage(): void {
    this.currentPage.update(p => p + 1);
  }
}
