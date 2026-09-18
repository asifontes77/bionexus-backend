import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  runControlledMysqlScript,
  splitControlledMysqlScript,
} from './controlled-sql-runner';

describe('controlled-sql-runner', () => {
  it('separa el SQL baseline y elimina las directivas DELIMITER', () => {
    const sql = readFileSync(join(__dirname, 'BioNexusBaseline.sql'), 'utf8');
    const statements = splitControlledMysqlScript(sql);
    expect(statements.length).toBeGreaterThan(45);
    expect(statements.some((value) => /CREATE TABLE `users`/.test(value))).toBe(true);
    expect(statements.some((value) => /CREATE.*TRIGGER/i.test(value))).toBe(true);
    expect(statements.every((value) => !/^\s*DELIMITER/i.test(value))).toBe(true);
  });

  it('respeta un bloque con delimitador alternativo', () => {
    const sql = [
      'CREATE TABLE `sample` (`id` int);',
      'DELIMITER ;;',
      'CREATE TRIGGER `sample_bi` BEFORE INSERT ON `sample`',
      'FOR EACH ROW BEGIN',
      '  SET NEW.id = COALESCE(NEW.id, 1);',
      'END;;',
      'DELIMITER ;',
      'INSERT INTO `sample` (`id`) VALUES (1);',
    ].join('\n');
    const statements = splitControlledMysqlScript(sql);
    expect(statements).toHaveLength(3);
    expect(statements[1]).toContain('CREATE TRIGGER');
    expect(statements[1]).toContain('END');
  });

  it('ejecuta una sentencia por llamada y preserva el orden', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const count = await runControlledMysqlScript(
      { query } as never,
      'CREATE TABLE `a` (`id` int);\nINSERT INTO `a` VALUES (1);',
    );
    expect(count).toBe(2);
    expect(query.mock.calls.map(([value]) => value)).toEqual([
      'CREATE TABLE `a` (`id` int)',
      'INSERT INTO `a` VALUES (1)',
    ]);
  });

  it('ignora blancos y comentarios finales fuera de sentencias', () => {
    const statements = splitControlledMysqlScript(
      'CREATE TABLE `a` (`id` int);\n\n-- cierre informativo\n',
    );
    expect(statements).toEqual(['CREATE TABLE `a` (`id` int)']);
  });
  it('rechaza SQL incompleto', () => {
    expect(() => splitControlledMysqlScript('CREATE TABLE `a` (`id` int)')).toThrow(
      'BIONEXUS_BASELINE_INCOMPLETE_SQL',
    );
  });
});