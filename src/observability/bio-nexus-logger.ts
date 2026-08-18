import { Logger } from '@nestjs/common';

export type BioNexusLogMetadata = Record<string, unknown>;

export class BioNexusLogger {
  private static readonly logger = new Logger('BioNexus');

  static info(message: string, context: string, metadata: BioNexusLogMetadata = {}): void {
    this.logger.log(this.format(message, metadata), context);
  }

  static warn(message: string, context: string, metadata: BioNexusLogMetadata = {}): void {
    this.logger.warn(this.format(message, metadata), context);
  }

  static debug(message: string, context: string, metadata: BioNexusLogMetadata = {}): void {
    this.logger.debug(this.format(message, metadata), context);
  }

  static error(error: unknown, context: string, metadata: BioNexusLogMetadata = {}): string {
    const normalized = this.normalize(error);
    this.logger.error(this.format(normalized.message, { ...metadata, name: normalized.name, code: normalized.code, cause: normalized.cause }), normalized.stack, context);
    return normalized.message;
  }

  private static format(message: string, metadata: BioNexusLogMetadata): string {
    return JSON.stringify({ timestamp: new Date().toISOString(), message, ...metadata });
  }

  private static normalize(error: unknown): { name: string; message: string; code: string | null; cause: string | null; stack?: string } {
    if (error instanceof Error) {
      const extended = error as Error & { code?: string; cause?: unknown };
      return { name: error.name, message: error.message, code: extended.code ?? null, cause: extended.cause instanceof Error ? extended.cause.message : extended.cause ? String(extended.cause) : null, stack: error.stack };
    }
    return { name: 'UnknownError', message: String(error), code: null, cause: null };
  }
}
