import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppFooterComponent } from '@layout/footer/app-footer.component';
import { AppSidebarComponent } from '@layout/sidebar/app-sidebar.component';
import { AppTopbarComponent } from '@layout/topbar/app-topbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, AppFooterComponent, AppSidebarComponent, AppTopbarComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {}
