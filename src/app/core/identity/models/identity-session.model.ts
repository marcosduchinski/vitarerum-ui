import { GroupName } from './group-name.enum';
import { IdentityUser } from './identity-user.model';

export interface IdentitySession {
  accessToken: string;
  user: IdentityUser;
  group: GroupName | null;
}
