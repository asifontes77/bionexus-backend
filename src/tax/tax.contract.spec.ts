import { readFileSync } from 'fs';
import { join } from 'path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('Tax hardened backend contract', () => {
  const controller = source('src/tax/tax.controller.ts');
  const service = source('src/tax/tax.service.ts');
  const createDto = source('src/tax/dto/create-tax.dto.ts');
  const updateDto = source('src/tax/dto/update-tax.dto.ts');
  const migration = source('src/database/migrations/20260827200000-TaxPermissions.ts');
  const taxModule = source('src/tax/tax.module.ts');

  it('provides PermissionGuard and audit dependencies in TaxModule', () => {
    expect(taxModule).toContain("import { AuthorizationModule } from '../authorization/authorization.module';");
    expect(taxModule).toContain("import { SecurityAuditModule } from '../audit/security-audit.module';");
    expect(taxModule).toContain('AuthorizationModule,');
    expect(taxModule).toContain('SecurityAuditModule,');
  });
  it('protects every endpoint with the normalized authorization foundation', () => {
    expect(controller).toContain('@UseGuards(JwtUserGuard, PermissionGuard)');
    for (const permission of ['tax.read', 'tax.create', 'tax.update', 'tax.delete']) {
      expect(controller).toContain(`@RequirePermissions('${permission}')`);
    }
    expect(controller).toContain('getSecurityAuditActorUserId(request)');
  });

  it('keeps the complete legacy tax contract in both DTOs', () => {
    for (const field of ['description', 'value', 'only_dollars', 'always_subtotal', 'hide']) {
      expect(createDto).toContain(field);
      expect(updateDto).toContain(field);
    }
    expect(createDto).not.toContain('id:');
    expect(updateDto).not.toContain('id?:');
  });

  it('uses controlled errors, transactional writes and security audit', () => {
    expect(service).toContain("throw new NotFoundException('TAX_NOT_FOUND')");
    expect(service).not.toContain('return new HttpException');
    expect(service).toContain('this.dataSource.transaction(action)');
    for (const action of ['tax.created', 'tax.updated', 'tax.deleted']) {
      expect(service).toContain(action);
    }
    expect(service).toContain('SECURITY_AUDIT_SERVICE_UNAVAILABLE');
    expect(service).toContain('repository.remove(tax)');
  });

  it('validates description, percentage, booleans and unknown fields', () => {
    for (const errorCode of [
      'TAX_DESCRIPTION_REQUIRED',
      'TAX_DESCRIPTION_TOO_LONG',
      'TAX_VALUE_INVALID',
      'TAX_BOOLEAN_INVALID',
      'TAX_FIELD_UNKNOWN',
      'TAX_UPDATE_REQUIRED',
      'TAX_ID_INVALID',
    ]) {
      expect(service).toContain(errorCode);
    }
  });

  it('creates four idempotent permissions and assigns them to active admin', () => {
    for (const permission of ['tax.read', 'tax.create', 'tax.update', 'tax.delete']) {
      expect(migration).toContain(permission);
    }
    expect(migration).toContain('ON DUPLICATE KEY UPDATE');
    expect(migration).toContain('INSERT IGNORE INTO security_role_permissions');
    expect(migration).toContain("role.code = 'admin'");
    expect(migration).toContain('role.is_active = 1');
  });
});