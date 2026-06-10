import { computed, Injectable, signal } from '@angular/core';

import { IdentityService } from './identity.service';
import { GroupName } from './models/group-name.enum';
import { IdentitySession, SessionPermission } from './models/identity-session.model';
import { LoginRequest } from './models/login.model';

interface MockAccount {
  readonly id: string;
  readonly name: string;
  readonly groups: readonly GroupName[];
}

function mockPermissions(accountId: string, groups: readonly GroupName[]): SessionPermission[] {
  return groups.map((group) => ({ permissionId: `perm-${accountId}-${group}`, group }));
}

const MOCK_ACCOUNTS: Record<string, MockAccount> = {
  'alice@ext.example.com':       { id: 'u-alice', name: 'Alice Ferreira', groups: ['EXTERNAL'] },
  'bob@collections.example.com': { id: 'u-bob',   name: 'Bob Santos',    groups: ['COLLECTIONS_MANAGEMENT'] },
  'carol@curatorial.example.com':{ id: 'u-carol', name: 'Carol Souza',   groups: ['CURATORIAL'] },
  'dan@direction.example.com':   { id: 'u-dan',   name: 'Dan Oliveira',  groups: ['DIRECTION'] },
  'eve@admin.example.com':       { id: 'u-eve',   name: 'Eve Lima',      groups: ['SYS_ADMIN'] },
  'fran@staff.example.com':      { id: 'u-fran',  name: 'Fran Costa',    groups: ['COLLECTIONS_MANAGEMENT', 'CURATORIAL', 'DIRECTION'] },
  'greg@collections.example.com':{ id: 'u-greg',  name: 'Greg Viana',    groups: ['COLLECTIONS_MANAGEMENT'] },
};

const UNKNOWN_ACCOUNT: MockAccount = { id: 'mock-user', name: '', groups: ['EXTERNAL'] };

@Injectable()
export class IdentityServiceMock implements IdentityService {
  private readonly sessionState = signal<IdentitySession | null>(null);

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly isStaff = computed(() => {
    const group = this.session()?.group;
    return group != null && group !== 'EXTERNAL';
  });

  // Password is ignored in the mock; identity is selected purely by email.
  async signIn(credentials: LoginRequest): Promise<void> {
    const { email } = credentials;
    const account = MOCK_ACCOUNTS[email] ?? UNKNOWN_ACCOUNT;
    const availableGroups = account.groups;
    this.sessionState.set({
      accessToken: 'mock-access-token',
      user: {
        id: account.id,
        email,
        displayName: account.name || email.split('@')[0] || 'Learning User',
      },
      group: availableGroups[0],
      availableGroups,
      permissions: mockPermissions(account.id, availableGroups),
    });
  }

  signOut(): void {
    this.sessionState.set(null);
  }

  getAccessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  getPermissionId(): string | null {
    const session = this.session();
    if (session === null) {
      return null;
    }

    return session.permissions?.find((p) => p.group === session.group)?.permissionId ?? null;
  }

  setGroup(group: GroupName): void {
    const session = this.session();
    if (session && session.availableGroups.includes(group)) {
      this.sessionState.set({ ...session, group });
    }
  }

  updateAvailableGroups(groups: readonly GroupName[]): void {
    const session = this.session();
    if (!session) return;
    // Keep current group if still in the new list, otherwise switch to first available
    const group = groups.includes(session.group as GroupName)
      ? session.group
      : (groups[0] ?? null);
    this.sessionState.set({
      ...session,
      group,
      availableGroups: groups,
      permissions: mockPermissions(session.user.id, groups),
    });
  }
}
