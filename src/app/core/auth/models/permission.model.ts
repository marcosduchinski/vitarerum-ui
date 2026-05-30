import { GroupName } from './group-name.enum';
import { Group } from './group.model';
import { User } from './user.model';

export interface PermissionSummary {
  readonly permissionId: string;
  readonly group: Group;
}

export interface PermissionPrincipal {
  readonly permissionId: string;
  readonly user: User;
  readonly group: GroupName;
}

export interface GroupMembership {
  readonly permissionId: string;
  readonly user: User;
  readonly group: Group;
}

export interface UserPermissionsResponse {
  readonly userId: string;
  readonly permissions: readonly PermissionSummary[];
}
