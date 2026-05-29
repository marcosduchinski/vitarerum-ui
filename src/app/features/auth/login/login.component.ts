import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IDENTITY_SERVICE } from '@core/identity/identity.service';
import { ButtonDirective, ButtonLabel } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ButtonDirective, ButtonLabel, InputText],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly identity = inject(IDENTITY_SERVICE);
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
      this.identity.signIn(this.email());
      void this.router.navigateByUrl('/p/dashboard');
    }
  }
}
