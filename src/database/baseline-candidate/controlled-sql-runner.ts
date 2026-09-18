import { QueryRunner } from 'typeorm';

/**
 * Divide un script MySQL respetando DELIMITER y comentarios de linea.
 * Las directivas DELIMITER no se envian al servidor.
 */
export function splitControlledMysqlScript(sql: string): string[] {
  const statements: string[] = [];
  const lines = sql.replace(/^\uFEFF/, '').split(/\r?\n/);
  let delimiter = ';';
  let buffer = '';

  for (const line of lines) {
    const directive = line.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
    if (directive) {
      if (buffer.trim()) throw new Error('BIONEXUS_BASELINE_DELIMITER_WITH_PENDING_SQL');
      delimiter = directive[1];
      continue;
    }

    if (!buffer.trim() && (!line.trim() || /^\s*--/.test(line))) continue;
    buffer += `${line}\n`;
    const trimmed = buffer.trimEnd();
    if (!trimmed.endsWith(delimiter)) continue;

    const statement = trimmed.slice(0, -delimiter.length).trim();
    if (statement) statements.push(statement);
    buffer = '';
  }

  if (buffer.trim()) throw new Error('BIONEXUS_BASELINE_INCOMPLETE_SQL');
  return statements;
}

/** Ejecuta secuencialmente las sentencias ya separadas. */
export async function runControlledMysqlScript(
  queryRunner: QueryRunner,
  sql: string,
): Promise<number> {
  const statements = splitControlledMysqlScript(sql);
  for (const statement of statements) await queryRunner.query(statement);
  return statements.length;
}