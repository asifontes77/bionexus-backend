import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { Client } from 'pg';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { resolveDatabaseOptions } from '../database.config';
import { PlatformModule } from '../../platform/platform.module';
import { PlatformCatalogReleaseService } from '../../platform/platform-catalog-release.service';

type InstallStage = 'startup' | 'database-create' | 'baseline' | 'platform-owner' | 'global-catalogs' | 'validation' | 'complete';
export const REQUIRED_GRANULAR_CATALOG_PACKAGES = [
  'antibiotics',
  'germs',
  'parasitic-forms',
  'sample-types',
  'taxes',
  'exam-groups',
  'exams',
  'currencies',
  'tariffs',
  'banks',
  'payment-methods',
] as const;
export const INITIAL_CATALOG_SCHEMA_VERSION = 'BioNexusBaseline1790366400000';
export interface SerializedInstallError { name: string; message: string; code?: string; detail?: string; constraint?: string; table?: string; column?: string; stack?: string; cause?: SerializedInstallError; }
export function isFirstInstallStateValid(result: Record<string, unknown>): boolean {
  return Number(result.active_owners) === 1
    && Number(result.granular_releases) === REQUIRED_GRANULAR_CATALOG_PACKAGES.length
    && Number(result.laboratories) === 0
    && Number(result.users) === 0
    && Number(result.subscription_schema_ready) === 1;
}
export function serializeInstallError(error: unknown, depth = 0): SerializedInstallError {
  if (depth > 5) return { name: 'Error', message: 'MAX_CAUSE_DEPTH_REACHED' };
  if (!(error instanceof Error)) return { name: 'UnknownError', message: String(error) };
  const value = error as Error & { code?: string; detail?: string; constraint?: string; table?: string; column?: string; cause?: unknown };
  return { name: value.name || 'Error', message: value.message || 'UNKNOWN_ERROR', code: value.code, detail: value.detail, constraint: value.constraint, table: value.table, column: value.column, stack: value.stack, cause: value.cause ? serializeInstallError(value.cause, depth + 1) : undefined };
}
export function writeInstallEvent(payload: Record<string, unknown>): void { process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), ...payload })}\n`); }
export function assertSafeDatabaseName(value: string): string {
  const database = value.trim();
  if (!/^bionexus(?:_[a-z0-9_]+)?$/i.test(database) || database.toLowerCase() === 'postgres') throw new Error(`UNSAFE_INSTALL_DATABASE:${database}`);
  return database;
}
function runNpmScript(script: string, environment: NodeJS.ProcessEnv): void {
  const command = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', `npm run ${script}`] : ['run', script];
  const result = spawnSync(command, args, { cwd: process.cwd(), env: environment, encoding: 'utf8', windowsHide: true });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`NPM_SCRIPT_FAILED:${script}:EXIT_${result.status ?? 'UNKNOWN'}`);
}
async function ensureDatabase(environment: NodeJS.ProcessEnv): Promise<{ database: string; created: boolean }> {
  const database = assertSafeDatabaseName(environment.DB_DATABASE ?? 'bionexus');
  const client = new Client({ host: environment.DB_HOST, port: Number(environment.DB_PORT ?? 5432), user: environment.DB_USER, password: environment.DB_PASSWORD, database: environment.DB_MAINTENANCE_DATABASE ?? 'postgres' });
  await client.connect();
  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [database]);
    if (existing.rowCount) return { database, created: false };
    await client.query(`CREATE DATABASE "${database.replace(/"/g, '""')}"`);
    return { database, created: true };
  } finally { await client.end(); }
}
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), JwtModule.registerAsync({ global: true, inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') ?? 'first-install-context-only' }) }), TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => resolveDatabaseOptions({ DB_HOST: config.get<string>('DB_HOST'), DB_PORT: config.get<string>('DB_PORT'), DB_USER: config.get<string>('DB_USER'), DB_PASSWORD: config.get<string>('DB_PASSWORD'), DB_DATABASE: config.get<string>('DB_DATABASE') }, __dirname) }), PlatformModule] })
class FirstInstallModule {}
export async function runFirstInstall(environment: NodeJS.ProcessEnv = process.env): Promise<void> {
  let stage: InstallStage = 'startup'; let databaseCreatedByRun = false; let context: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined; const startedAt = Date.now();
  const emit = (status: 'started'|'succeeded', data: Record<string, unknown>={}) => writeInstallEvent({ type:'stage', stage, status, ...data });
  try {
    emit('started');
    stage='database-create'; emit('started'); const databaseResult=await ensureDatabase(environment); databaseCreatedByRun=databaseResult.created; emit('succeeded', databaseResult);
    stage='baseline'; emit('started'); runNpmScript('migration:run', environment); emit('succeeded');
    stage='platform-owner'; emit('started');
    context=await NestFactory.createApplicationContext(FirstInstallModule,{logger:['error','warn','log']});
    const dataSource=context.get(DataSource);
    let owners=await dataSource.query('SELECT id,username FROM platform_owners WHERE is_active=true ORDER BY id');
    if (owners.length===0) {
      await context.close(); context=undefined;
      runNpmScript('bootstrap:platform-owner', environment);
      context=await NestFactory.createApplicationContext(FirstInstallModule,{logger:['error','warn','log']});
      owners=await context.get(DataSource).query('SELECT id,username FROM platform_owners WHERE is_active=true ORDER BY id');
    }
    if (owners.length!==1) throw new Error(`ACTIVE_PLATFORM_OWNER_COUNT_INVALID:${owners.length}`);
    const ownerId=Number(owners[0].id); emit('succeeded',{ownerId,username:owners[0].username});
    stage='global-catalogs'; emit('started'); const catalogs=await context.get(PlatformCatalogReleaseService).bootstrapInitialReleases(ownerId); emit('succeeded',{releaseVersion:catalogs.releaseVersion,registered:catalogs.registered.length});
    stage='validation'; emit('started');
    const checks=await context.get(DataSource).query(
      `SELECT (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS tables,(SELECT count(*)::int FROM platform_owners WHERE is_active=true) AS active_owners,(SELECT count(*)::int FROM platform_catalog_releases WHERE status='published') AS global_releases,(SELECT count(DISTINCT package_code)::int FROM platform_catalog_releases WHERE status='published' AND minimum_schema_version=$2 AND package_code=ANY($1::text[])) AS granular_releases,(SELECT count(*)::int FROM laboratory) AS laboratories,(SELECT count(*)::int FROM users) AS users,
       ((SELECT count(*) FROM migrations WHERE name IN ('BioNexusBaseline1790366400000','AddPlatformLaboratoryLifecycle1793847600000','AddPlatformSubscriptionCatalogAndBilling1793862000000'))=3
         AND to_regclass('public.platform_subscription_plans') IS NOT NULL
         AND to_regclass('public.platform_subscriptions') IS NOT NULL
         AND to_regclass('public.platform_subscription_payments') IS NOT NULL
         AND to_regclass('public.platform_billing_audit_logs') IS NOT NULL
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='laboratory' AND column_name='plan_grace_period_days'))::int AS subscription_schema_ready`,
      [REQUIRED_GRANULAR_CATALOG_PACKAGES, INITIAL_CATALOG_SCHEMA_VERSION],
    );
    const result=checks[0]??{};
    if(!isFirstInstallStateValid(result)) throw new Error(`FIRST_INSTALL_VALIDATION_FAILED:${JSON.stringify(result)}`);
    emit('succeeded',result); stage='complete'; writeInstallEvent({type:'result',success:true,stage,durationMs:Date.now()-startedAt,...result});
  } catch(error:unknown) {
    const serialized=serializeInstallError(error);
    if(context){await context.close();context=undefined;}
    if(databaseCreatedByRun){
      const database=assertSafeDatabaseName(environment.DB_DATABASE ?? 'bionexus');
      const maintenance=new Client({host:environment.DB_HOST,port:Number(environment.DB_PORT ?? 5432),user:environment.DB_USER,password:environment.DB_PASSWORD,database:environment.DB_MAINTENANCE_DATABASE ?? 'postgres'});
      try{await maintenance.connect();await maintenance.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',[database]);await maintenance.query(`DROP DATABASE IF EXISTS "${database.replace(/"/g,'""')}"`);writeInstallEvent({type:'cleanup',success:true,database,reason:'installation-failed'});}
      catch(cleanupError:unknown){writeInstallEvent({type:'cleanup',success:false,database,error:serializeInstallError(cleanupError)});}
      finally{await maintenance.end().catch(()=>undefined);}
    }
    writeInstallEvent({type:'result',success:false,stage,durationMs:Date.now()-startedAt,error:serialized});process.exitCode=1;
  }
  finally { if(context) await context.close(); }
}
process.on('unhandledRejection',(reason)=>{writeInstallEvent({type:'fatal',success:false,stage:'unhandledRejection',error:serializeInstallError(reason)});process.exitCode=1;});
process.on('uncaughtException',(error)=>{writeInstallEvent({type:'fatal',success:false,stage:'uncaughtException',error:serializeInstallError(error)});process.exitCode=1;});
if(require.main===module) void runFirstInstall();
