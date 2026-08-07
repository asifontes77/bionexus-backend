import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY =
  'authorization.required-permissions';

export function RequirePermissions(
  ...permissionCodes: string[]
): MethodDecorator & ClassDecorator {
  const normalizedPermissionCodes = Array.from(
    new Set(
      permissionCodes
        .filter(
          (permissionCode): permissionCode is string =>
            typeof permissionCode === 'string',
        )
        .map((permissionCode) =>
          permissionCode.trim().toLowerCase(),
        )
        .filter((permissionCode) => permissionCode !== ''),
    ),
  );

  return SetMetadata(
    REQUIRED_PERMISSIONS_KEY,
    normalizedPermissionCodes,
  );
}
