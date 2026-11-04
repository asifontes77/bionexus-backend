import { readFileSync } from 'fs';

describe('Platform owner runtime context contract', () => {
  const platformController = readFileSync('src/platform/platform.controller.ts', 'utf8');
  const catalogController = readFileSync('src/platform/platform-catalog-release.controller.ts', 'utf8');

  it('resuelve primero userId emitido por JwtUserGuard y conserva id como compatibilidad', () => {
    expect(platformController).toContain('request.user?.userId ?? request.user?.id');
    expect(catalogController).toContain('request.user?.userId ?? request.user?.id');
  });

  it('responde el contexto ausente como error HTTP controlado y no como 500 generico', () => {
    expect(platformController).toContain("throw new BadRequestException('PLATFORM_OWNER_CONTEXT_REQUIRED')");
    expect(platformController).not.toContain("throw new Error('PLATFORM_OWNER_CONTEXT_REQUIRED')");
  });
});
