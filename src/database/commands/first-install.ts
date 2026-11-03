import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { resolveDatabaseOptions } from '../database.config';
import { PlatformModule } from '../../platform/platform.module';
import { PlatformCatalogReleaseService } from '../../platform/platform-catalog-release.service';
import { PlatformProvisioningService } from '../../platform/platform-provisioning.service';
import { resolveProvisionLaboratoryInput } from './provision-laboratory';

type InstallStage = 'startup' | 'database' | 'owner' | 'global-catalogs' | 'laboratory' | 'validation' | 'complete';

export interface SerializedInstallError {
  name: string;
  message: string;
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  column?: string;
  stack?: string;
  cause?: SerializedInstallError;
}

export function serializeInstallError(error: unknown, depth = 0): SerializedInstallError {
  if (depth > 5) return { name: 'Error', message: 'MAX_CAUSE_DEPTH_REACHED' };
  if (!(error instanceof Error)) return { name: 'UnknownError', message: String(error) };
  const value = error as Error & { code?: string; detail?: string; constraint?: string; table?: string; column?: string; cause?: unknown };
  return {
    name: value.name || 'Error', message: value.message || 'UNKNOWN_ERROR', code: value.code,
    detail: value.detail, constraint: value.constraint, table: value.table, column: value.column,
    stack: value.stack, cause: value.cause ? serializeInstallError(value.cause, depth + 1) : undefined,
  };
}

export function writeInstallEvent(payload: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), ...payload })}\n`);
}

@Module({ imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => resolveDatabaseOptions({
    DB_HOST: config.get<string>('DB_HOST'), DB_PORT: config.get<string>('DB_PORT'), DB_USER: config.get<string>('DB_USER'),
    DB_PASSWORD: config.get<string>('DB_PASSWORD'), DB_DATABASE: config.get<string>('DB_DATABASE'),
  }, __dirname) }),
  PlatformModule,
] })
class FirstInstallModule {}

export async function runFirstInstall(environment: NodeJS.ProcessEnv = process.env): Promise<void> {
  let stage: InstallStage = 'startup';
  let context: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined;
  const startedAt = Date.now();
  const emit = (status: 'started' | 'succeeded', data: Record<string, unknown> = {}) => writeInstallEvent({ type: 'stage', stage, status, ...data });
  try {
    emit('started');
    context = await NestFactory.createApplicationContext(FirstInstallModule, { logger: ['error', 'warn', 'log'] });
    stage = 'database'; emit('started');
    const dataSource = context.get(DataSource);
    const database = String(dataSource.options.database ?? '');
    if (!database.startsWith('bionexus_test_')) throw new Error(`UNSAFE_INSTALL_DATABASE:${database}`);
    const schema = await dataSource.query("SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
    if (Number(schema[0]?.tables ?? 0) !== 54) throw new Error(`BASELINE_TABLE_COUNT_INVALID:${schema[0]?.tables ?? 0}`);
    emit('succeeded', { database, tables: 54 });

    stage = 'owner'; emit('started');
    const owners = await dataSource.query('SELECT id, username FROM platform_owners WHERE is_active=true ORDER BY id');
    if (owners.length !== 1) throw new Error(`ACTIVE_PLATFORM_OWNER_COUNT_INVALID:${owners.length}`);
    const ownerId = Number(owners[0].id);
    emit('succeeded', { ownerId, username: owners[0].username });

    stage = 'global-catalogs'; emit('started');
    const globalResult = await context.get(PlatformCatalogReleaseService).bootstrapInitialReleases(ownerId);
    emit('succeeded', { releaseVersion: globalResult.releaseVersion, registered: globalResult.registered.length });

    stage = 'laboratory'; emit('started');
    const input = resolveProvisionLaboratoryInput(environment);
    if (input.platformOwnerUsername !== String(owners[0].username).trim().toLowerCase()) throw new Error('PLATFORM_OWNER_USERNAME_MISMATCH');
    const provisioned = await context.get(PlatformProvisioningService).provision(input.dto, ownerId);
    emit('succeeded', {
      laboratoryId: (provisioned.laboratory as { id?: number }).id,
      branchId: (provisioned.mainBranch as { id?: number }).id,
      administratorId: (provisioned.administrator as { id?: number }).id,
      installedCatalogPackages: provisioned.installedCatalogPackages,
    });

    stage = 'validation'; emit('started');
    const checks = await dataSource.query(`
      SELECT
        (SELECT count(*)::int FROM platform_catalog_releases WHERE status='published') AS global_releases,
        (SELECT count(*)::int FROM laboratories) AS laboratories,
        (SELECT count(*)::int FROM laboratory_branches) AS branches,
        (SELECT count(*)::int FROM users) AS users,
        (SELECT count(*)::int FROM laboratory_catalog_packages) AS tenant_packages
    `);
    emit('succeeded', checks[0] ?? {});
    stage = 'complete';
    writeInstallEvent({ type: 'result', success: true, stage, durationMs: Date.now() - startedAt, ...checks[0] });
  } catch (error: unknown) {
    writeInstallEvent({ type: 'result', success: false, stage, durationMs: Date.now() - startedAt, error: serializeInstallError(error) });
    process.exitCode = 1;
  } finally {
    if (context) await context.close();
  }
}

process.on('unhandledRejection', (reason) => {
  writeInstallEvent({ type: 'fatal', success: false, stage: 'unhandledRejection', error: serializeInstallError(reason) });
  process.exitCode = 1;
});
process.on('uncaughtException', (error) => {
  writeInstallEvent({ type: 'fatal', success: false, stage: 'uncaughtException', error: serializeInstallError(error) });
  process.exitCode = 1;
});

if (require.main === module) void runFirstInstall();
