import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly canEnter = computed(() => this.email().includes('@'));

  protected updateEmail(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.email.set(event.target.value);
    }
  }

  protected enterWorkspace(): void {
    if (this.canEnter()) {
      void this.router.navigateByUrl('/p/dashboard');
    }
  }
}
