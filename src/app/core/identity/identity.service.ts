import { InjectionToken, Signal } from '@angular/core';

import { IdentitySession } from './models/identity-session.model';

export interface IdentityService {
  readonly session: Signal<IdentitySession | null>;
  readonly isAuthenticated: Signal<boolean>;
  signIn(email: string): void;
  signOut(): void;
  getAccessToken(): string | null;
}

export const IDENTITY_SERVICE = new InjectionToken<IdentityService>('IDENTITY_SERVICE');
