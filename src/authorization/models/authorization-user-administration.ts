import { SafeUserResponse } from '../../users/responses/user-response.mapper';
import { SecurityRole } from '../entities/security-role.entity';
import { SecurityPermission } from '../entities/security-permission.entity';
import { SecurityPermissionEffect } from '../entities/security-user-permission-override.entity';
import { AuthorizationContext } from './authorization-context';

export interface AuthorizationPermissionOverrideView {
  permission: SecurityPermission;
  effect: SecurityPermissionEffect;
}

export interface AuthorizationUserAdministration {
  user: SafeUserResponse;
  assignedRoles: SecurityRole[];
  inheritedPermissions: SecurityPermission[];
  permissionOverrides: AuthorizationPermissionOverrideView[];
  context: AuthorizationContext | null;
}

export interface AuthorizationUserListItem {
  user: SafeUserResponse;
  assignedRoles: SecurityRole[];
}
