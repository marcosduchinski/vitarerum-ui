import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { USE_MOCK_API } from '@core/config/app-config.model';
import { IDENTITY_SERVICE } from '@core/identity/identity.service';
import { GroupName } from '@core/identity/models/group-name.enum';
import { LayoutService } from '@layout/layout.service';

const ALL_GROUPS: readonly { value: GroupName; label: string }[] = [
  { value: 'EXTERNAL', label: 'External researcher' },
  { value: 'COLLECTIONS_MANAGEMENT', label: 'Collections management' },
  { value: 'CURATORIAL', label: 'Curatorial' },
  { value: 'DIRECTION', label: 'Direction' },
];

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
  protected readonly groups = ALL_GROUPS;

  protected onGroupChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as GroupName;
    this.identity.setGroup(value);
  }

  protected signOut(): void {
    this.identity.signOut();
  }
}
