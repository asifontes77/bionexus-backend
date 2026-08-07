export interface AuthorizationContext {
  userId: number;
  roles: string[];
  permissions: string[];
  deniedPermissions: string[];
}
