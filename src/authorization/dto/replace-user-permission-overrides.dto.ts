import { SecurityPermissionEffect } from '../entities/security-user-permission-override.entity';

export class ReplaceUserPermissionOverrideDto {
  permissionId: number;
  effect: SecurityPermissionEffect;
}

export class ReplaceUserPermissionOverridesDto {
  overrides: ReplaceUserPermissionOverrideDto[];
}
