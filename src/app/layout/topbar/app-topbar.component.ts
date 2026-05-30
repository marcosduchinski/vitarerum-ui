import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { USE_MOCK_API } from '@core/config/app-config.model';
import { IDENTITY_SERVICE } from '@core/identity/identity.service';
import { GroupName } from '@core/identity/models/group-name.enum';
import { LayoutService } from '@layout/layout.service';

const GROUP_LABELS: Record<GroupName, string> = {
  EXTERNAL: 'External researcher',
  COLLECTIONS_MANAGEMENT: 'Collections management',
  CURATORIAL: 'Curatorial',
  DIRECTION: 'Direction',
  ADMIN: 'Administrator',
};

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './app-topbar.component.html',
  styleUrl: './app-topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppTopbarComponent {
  protected readonly layoutService = inject(LayoutService);
  private readonly identity = inject(IDENTITY_SERVICE);

  protected readonly isMock = inject(USE_MOCK_API);
  protected readonly session = this.identity.session;
  protected readonly displayName = computed(() => this.session()?.user.displayName ?? '');
  protected readonly currentGroup = computed(() => this.session()?.group ?? null);

  protected readonly availableGroups = computed(() =>
    (this.session()?.availableGroups ?? []).map(g => ({ value: g, label: GROUP_LABELS[g] })),
  );

  protected readonly showSwitcher = computed(
    () => this.isMock && this.availableGroups().length > 0,
  );

  protected onGroupChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as GroupName;
    this.identity.setGroup(value);
  }

  protected signOut(): void {
    this.identity.signOut();
  }
}
