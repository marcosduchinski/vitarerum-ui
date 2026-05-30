import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IDENTITY_SERVICE } from '@core/identity/identity.service';

import { NAV_SECTIONS, NavSection } from './nav-config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidebarComponent {
  private readonly identity = inject(IDENTITY_SERVICE);

  protected readonly sections = computed<readonly NavSection[]>(() => {
    const group = this.identity.session()?.group;
    return group ? NAV_SECTIONS[group] : [];
  });
}
