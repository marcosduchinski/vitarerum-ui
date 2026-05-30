import { InjectionToken, Signal } from '@angular/core';

import { GroupName } from './models/group-name.enum';
import { IdentitySession } from './models/identity-session.model';

export interface IdentityService {
  readonly session: Signal<IdentitySession | null>;
  readonly isAuthenticated: Signal<boolean>;
  signIn(email: string): void;
  signOut(): void;
  getAccessToken(): string | null;
  setGroup(group: GroupName): void;
}

export const IDENTITY_SERVICE = new InjectionToken<IdentityService>('IDENTITY_SERVICE');
