import { computed, Injectable, signal } from '@angular/core';

import { IdentityService } from './identity.service';
import { GroupName } from './models/group-name.enum';
import { IdentitySession } from './models/identity-session.model';

@Injectable()
export class IdentityServiceImpl implements IdentityService {
  private readonly sessionState = signal<IdentitySession | null>(null);

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.session() !== null);

  // TODO(real-auth): trigger the configured OIDC redirect here.
  // Until the IdP contract is implemented, the real service must not mint a
  // client-side development token. Local demo access belongs in IdentityServiceMock.
  signIn(email: string): void {
    void email;
    this.sessionState.set(null);
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
