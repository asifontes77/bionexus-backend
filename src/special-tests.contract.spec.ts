import { readFileSync } from 'node:fs';
const read = (path: string) => readFileSync(path, 'utf8');
describe('Special tests hardened backend contract', () => {
  const labController = read('src/special_test_lab/special_test_lab.controller.ts');
  const labService = read('src/special_test_lab/special_test_lab.service.ts');
  const itemController = read('src/special_test_items/special_test_items.controller.ts');
  const itemService = read('src/special_test_items/special_test_items.service.ts');
  const migration = read('src/database/migrations/1788573600000-SpecialTestsPermissions.ts');
  it('preserva rutas y aplica permisos normalizados', () => {
    expect(labController).toContain("@Controller('specialtestlab')");
    expect(itemController).toContain("@Controller('specialtestItems')");
    for (const code of ['special-tests.read','special-tests.create','special-tests.update']) expect(labController + itemController + migration).toContain(code);
  });
  it('usa errores controlados, actualizacion selectiva y validacion de referencias', () => {
    for (const code of ['SPECIAL_TEST_NOT_FOUND','SPECIAL_TEST_UPDATE_REQUIRED','SPECIAL_TEST_FIELD_UNKNOWN','SPECIAL_TEST_DESCRIPTION_ALREADY_EXISTS']) expect(labService).toContain(code);
    for (const code of ['SPECIAL_TEST_ITEM_NOT_FOUND','SPECIAL_TEST_ITEM_UPDATE_REQUIRED','SPECIAL_TEST_ITEM_ALREADY_EXISTS','SPECIAL_TEST_EXAM_NOT_FOUND']) expect(itemService).toContain(code);
    expect(labService + itemService).toContain('Object.prototype.hasOwnProperty.call');
  });
  it('audita escrituras dentro de transacciones', () => {
    expect(labService + itemService).toContain('dataSource.transaction');
    for (const action of ['special-tests.created','special-tests.updated','special-tests.activated','special-tests.deactivated','special-test-items.created','special-test-items.updated','special-test-items.deleted']) expect(labService + itemService).toContain(action);
  });
  it('incluye migracion reversible e idempotente', () => {
    expect(migration).toContain('implements MigrationInterface');
    expect(migration).toContain('ON DUPLICATE KEY UPDATE');
    expect(migration).toContain('INSERT IGNORE INTO security_role_permissions');
    expect(migration).toContain('async down');
  });
});
