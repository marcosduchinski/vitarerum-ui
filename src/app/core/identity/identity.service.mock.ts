import { computed, Injectable, signal } from '@angular/core';

import { IdentityService } from './identity.service';
import { GroupName } from './models/group-name.enum';
import { IdentitySession } from './models/identity-session.model';

interface MockAccount {
  readonly id: string;
  readonly name: string;
  readonly groups: readonly GroupName[];
}

const MOCK_ACCOUNTS: Record<string, MockAccount> = {
  'alice@ext.example.com':       { id: 'u-alice', name: 'Alice Ferreira', groups: ['EXTERNAL'] },
  'bob@collections.example.com': { id: 'u-bob',   name: 'Bob Santos',    groups: ['COLLECTIONS_MANAGEMENT'] },
  'carol@curatorial.example.com':{ id: 'u-carol', name: 'Carol Souza',   groups: ['CURATORIAL'] },
  'dan@direction.example.com':   { id: 'u-dan',   name: 'Dan Oliveira',  groups: ['DIRECTION'] },
  'eve@admin.example.com':       { id: 'u-eve',   name: 'Eve Lima',      groups: ['ADMIN'] },
  'fran@staff.example.com':      { id: 'u-fran',  name: 'Fran Costa',    groups: ['COLLECTIONS_MANAGEMENT', 'CURATORIAL', 'DIRECTION'] },
};

const UNKNOWN_ACCOUNT: Omit<MockAccount, 'id'> = { name: '', groups: ['EXTERNAL'] };

@Injectable()
export class IdentityServiceMock implements IdentityService {
  private readonly sessionState = signal<IdentitySession | null>(null);

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.session() !== null);

  signIn(email: string): void {
    const account = MOCK_ACCOUNTS[email] ?? UNKNOWN_ACCOUNT;
    const availableGroups = account.groups;
    this.sessionState.set({
      accessToken: 'mock-access-token',
      user: {
        id: (account as MockAccount).id ?? 'mock-user',
        email,
        displayName: account.name || email.split('@')[0] || 'Learning User',
      },
      group: availableGroups[0],
      availableGroups,
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
    if (session && session.availableGroups.includes(group)) {
      this.sessionState.set({ ...session, group });
    }
  }
}
