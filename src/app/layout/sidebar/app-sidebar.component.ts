import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidebarComponent {
  protected readonly navItems = signal<NavItem[]>([
    {
      label: 'Dashboard',
      path: '/p/dashboard',
    },
  ]);
}
