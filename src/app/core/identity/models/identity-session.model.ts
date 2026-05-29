import { IdentityUser } from './identity-user.model';

export interface IdentitySession {
  accessToken: string;
  user: IdentityUser;
}
