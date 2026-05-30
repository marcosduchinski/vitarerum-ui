import { computed, Injectable, signal } from '@angular/core';

import { IdentityService } from './identity.service';
import { GroupName } from './models/group-name.enum';
import { IdentitySession } from './models/identity-session.model';

@Injectable()
export class IdentityServiceMock implements IdentityService {
  private readonly sessionState = signal<IdentitySession | null>(null);

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.session() !== null);

  signIn(email: string): void {
    this.sessionState.set({
      accessToken: 'mock-access-token',
      user: {
        id: 'mock-user',
        email,
        displayName: email.split('@')[0] || 'Learning User',
      },
      group: 'EXTERNAL',
    });
  }

  signOut(): void {
    this.sessionState.set(null);
  }

  getAccessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  setGroup(group: GroupName): void {
    const session = this.session();
    if (session) {
      this.sessionState.set({ ...session, group });
    }
  }
}
