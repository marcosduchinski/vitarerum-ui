import { computed, Injectable, signal } from '@angular/core';

import { IdentityService } from './identity.service';
import { GroupName } from './models/group-name.enum';
import { IdentitySession } from './models/identity-session.model';

@Injectable()
export class IdentityServiceImpl implements IdentityService {
  private readonly sessionState = signal<IdentitySession | null>(null);

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.session() !== null);

  // TODO(real-auth): replace with OIDC redirect (e.g. angular-oauth2-oidc).
  // On callback: parse JWT → set accessToken, user, and availableGroups from the
  // "groups" claim. The email param becomes unused once the IdP owns the flow.
  signIn(email: string): void {
    this.sessionState.set({
      accessToken: 'development-access-token',
      user: {
        id: 'development-user',
        email,
        displayName: email.split('@')[0] || 'Learning User',
      },
      group: null,
      availableGroups: [],
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

  // In production, available groups come from the JWT — no client-side update needed.
  updateAvailableGroups(groups: readonly GroupName[]): void {
    void groups;
  }
}
