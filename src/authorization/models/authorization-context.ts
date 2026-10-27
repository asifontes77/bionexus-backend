export interface AuthorizationContext {
  userId: number;
  laboratoryId?: number;
  roles: string[];
  permissions: string[];
  deniedPermissions: string[];
}
