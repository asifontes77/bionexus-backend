import { Logger } from '@nestjs/common';

export type BioNexusLogMetadata = Record<string, unknown>;

export class BioNexusLogger {
  private static readonly logger = new Logger('BioNexus');
  private static readonly secretKeys = /password|passwordSignature|token|authorization|cookie|license/i;

  static info(message: string, context = 'Application', metadata: BioNexusLogMetadata = {}): void {
    this.logger.log(this.format('INFO', context, message, metadata));
  }

  static success(message: string, context = 'Application', metadata: BioNexusLogMetadata = {}): void {
    this.logger.log(this.format('SUCCESS', context, message, metadata));
  }

  static warning(message: string, context = 'Application', metadata: BioNexusLogMetadata = {}): void {
    this.logger.warn(this.format('WARNING', context, message, metadata));
  }

  static warn(message: string, context = 'Application', metadata: BioNexusLogMetadata = {}): void {
    this.warning(message, context, metadata);
  }

  static error(error: unknown, context = 'Application', metadata: BioNexusLogMetadata = {}): string {
    const normalized = this.normalizeError(error);
    this.logger.error(this.format('ERROR', context, normalized.message, metadata), normalized.stack);
    return normalized.message;
  }

  static debug(message: string, context = 'Application', metadata: BioNexusLogMetadata = {}): void {
    if (process.env.BIONEXUS_LOG_LEVEL?.trim().toUpperCase() !== 'DEBUG') return;
    this.logger.debug(this.format('DEBUG', context, message, metadata));
  }

  private static format(level: string, source: string, message: string, metadata: BioNexusLogMetadata): string {
    const safe = this.sanitize(metadata);
    const operation = this.parseOperation(message);
    const lines = [`[${level}]`, `    Caller: ${source}`];
    if (operation) lines.push(`    Peticion: ${operation.method} ${operation.path}`);
    else lines.push(`    Mensaje: ${message}`);
    if (operation?.status) lines.push(`    Estado: ${operation.status}`);
    if (safe.durationMs !== undefined) lines.push(`    Duracion: ${this.value(safe.durationMs)} ms`);
    if (safe.code !== undefined) lines.push(`    Codigo: ${this.value(safe.code)}`);
    if (safe.userId !== undefined && safe.userId !== null) lines.push(`    Usuario: ${this.value(safe.userId)}`);
    if (safe.requestId !== undefined) lines.push(`    Solicitud: ${this.value(safe.requestId)}`);
    for (const [key, value] of Object.entries(safe)) {
      if (['durationMs', 'code', 'userId', 'requestId'].includes(key) || value === undefined || value === null || value === '') continue;
      lines.push(`    ${this.label(key)}: ${this.value(value)}`);
    }
    return lines.join('\n');
  }

  private static parseOperation(message: string): { method: string; path: string; status: string } | null {
    const matched = message.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)\s+->\s+(\d{3})$/i);
    return matched ? { method: matched[1].toUpperCase(), path: matched[2], status: matched[3] } : null;
  }

  private static label(key: string): string {
    const labels: Record<string, string> = { host: 'Host', port: 'Puerto', https: 'HTTPS', summary: 'Resumen', action: 'Accion' };
    return labels[key] ?? key;
  }
  private static sanitize(metadata: BioNexusLogMetadata): BioNexusLogMetadata {
    return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, this.secretKeys.test(key) ? '[PROTEGIDO]' : value]));
  }

  private static value(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    try { return JSON.stringify(value); } catch { return '[NO_SERIALIZABLE]'; }
  }

  private static normalizeError(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) return { message: error.message, stack: error.stack };
    return { message: String(error) };
  }
}
