import { readFileSync } from 'fs';
import { join } from 'path';

describe('Normalized payment foundation migration', () => {
  const source = readFileSync(join(__dirname, '../migrations/1789257600000-NormalizedPaymentFoundation.ts'), 'utf8');

  it('creates normalized catalogs and relations', () => {
    for (const table of ['currencies','banks','payment_method_currencies','payment_method_fields','payment_item_field_values']) expect(source).toContain(`CREATE TABLE ${table}`);
  });

  it('migrates history before removing legacy columns', () => {
    const migrate = source.indexOf('INSERT INTO payment_item_field_values');
    const remove = source.indexOf('DROP COLUMN description_1');
    expect(migrate).toBeGreaterThan(-1);
    expect(remove).toBeGreaterThan(migrate);
    expect(source).toContain('UPDATE way_pay_items SET id_type_payment=1 WHERE id_type_payment=2');
  });

  it('removes fixed legacy payment structure', () => {
    for (const column of ['description_1','description_2','only_dollars','dollar_value','dollar_date','amountDollar']) expect(source).toContain(`DROP COLUMN ${column}`);
  });

  it('adds restrictive integrity constraints', () => {
    for (const constraint of ['FK_way_pay_items_type_payment','FK_way_pay_items_currency','UQ_type_payment_code','UQ_payment_item_field_value']) expect(source).toContain(constraint);
  });

  it('is reversible and delegates transactions to TypeORM', () => {
    expect(source).toContain('async down');
    expect(source).not.toContain('startTransaction');
    expect(source).not.toContain('commitTransaction');
    expect(source).not.toContain('rollbackTransaction');
  });

  it('preserves unlabeled historical auxiliary values', () => {
    expect(source).toContain("'legacy_aux_1'");
    expect(source).toContain("'legacy_aux_2'");
  });

  it('restores consolidated cash and historical assignments on down', () => {
    expect(source).toContain('DELETE FROM type_payment');
    expect(source).toContain('UPDATE way_pay_items SET id_type_payment=2');
  });

  it('restores exact accented labels and historical dollar flag', () => {
    expect(source).toContain('DELETE FROM type_payment');
    expect(source).toContain('USING utf8mb4');
    expect(source).toContain('amount=local_equivalent_amount,amountDollar=base_amount,dollar=0');
  });

  it('preserves the original local equivalent amount', () => {
    expect(source).toContain('ADD local_equivalent_amount');
    expect(source).toContain('local_equivalent_amount=amount');
    expect(source).toContain('amount=local_equivalent_amount');
  });

  it('rejects empty hexadecimal literals in the down catalog restore', () => {
    expect(source).not.toContain('CONVERT(0x USING utf8mb4)');
    expect(source).toContain("SELECT 1,CONVERT(UNHEX('456665637469766F') USING utf8mb4),'','',0,0 WHERE @restore_legacy_payment_catalog=1");
    expect(source.split("CONVERT(UNHEX('20') USING utf8mb4)").length - 1).toBe(2);
  });

  it('restores the original physical type_payment definition', () => {
    expect(source).toContain('MODIFY description varchar(50) NULL');
    expect(source).toContain('ALTER TABLE type_payment AUTO_INCREMENT=6');
    expect(source).toContain("CONVERT(UNHEX('456665637469766F') USING utf8mb4)");
  });

  it('preserves the original exchange rate decimal scale', () => {
    expect(source).toContain('ADD exchange_rate_decimal_places');
    expect(source).toContain('exchange_rate_decimal_places=CASE');
    expect(source).toContain("FORMAT(exchange_rate,exchange_rate_decimal_places,'en_US')");
    expect(source).toContain('DROP COLUMN exchange_rate_decimal_places');
  });

  it('keeps the legacy payment catalog empty when the source was empty', () => {
    expect(source).toContain('SET @restore_legacy_payment_catalog');
    expect(source.split('WHERE @restore_legacy_payment_catalog=1').length - 1).toBe(5);
  });

  it('rejects an unclosed derived table in the legacy catalog restore', () => {
    expect(source).not.toContain('SELECT legacy.* FROM (SELECT');
    expect(source).not.toContain(') legacy WHERE @restore_legacy_payment_catalog');
    expect(source.split('WHERE @restore_legacy_payment_catalog=1').length - 1).toBe(5);
  });
});

