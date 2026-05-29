import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './app-topbar.component.html',
  styleUrl: './app-topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppTopbarComponent {
  protected readonly currentUser = signal('Learning User');
  protected readonly title = computed(() => `Welcome, ${this.currentUser()}`);
}
