import { computed, Injectable, signal } from '@angular/core';

import { IdentityService } from './identity.service';
import { IdentitySession } from './models/identity-session.model';

@Injectable()
export class IdentityServiceImpl implements IdentityService {
  private readonly sessionState = signal<IdentitySession | null>(null);

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.session() !== null);

  signIn(email: string): void {
    this.sessionState.set({
      accessToken: 'development-access-token',
      user: {
        id: 'development-user',
        email,
        displayName: email.split('@')[0] || 'Learning User',
      },
    });
  }

  signOut(): void {
    this.sessionState.set(null);
  }

  getAccessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }
}
