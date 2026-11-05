import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { resolveDatabaseOptions } from '../database.config';
import { PlatformModule } from '../../platform/platform.module';
import { PlatformProvisioningService } from '../../platform/platform-provisioning.service';
import { CreatePlatformLaboratoryDto } from '../../platform/dto/create-platform-laboratory.dto';

export interface ProvisionLaboratoryEnvironment {
  BIONEXUS_PROVISION_OWNER_USERNAME?: string;
  BIONEXUS_PROVISION_RIF?: string;
  BIONEXUS_PROVISION_ACCESS_SLUG?: string;
  BIONEXUS_PROVISION_NAME?: string;
  BIONEXUS_PROVISION_BUSINESS_NAME?: string;
  BIONEXUS_PROVISION_ADDRESS?: string;
  BIONEXUS_PROVISION_PHONE?: string;
  BIONEXUS_PROVISION_EMAIL?: string;
  BIONEXUS_PROVISION_PLAN_CODE?: string;
  BIONEXUS_PROVISION_SUBSCRIPTION_STATUS?: string;
  BIONEXUS_PROVISION_SERVICE_STARTS_AT?: string;
  BIONEXUS_PROVISION_SERVICE_EXPIRES_AT?: string;
  BIONEXUS_PROVISION_GRACE_UNTIL?: string;
  BIONEXUS_PROVISION_PERPETUAL_FREE_REASON?: string;
  BIONEXUS_PROVISION_COMMERCIAL_NOTES?: string;
  BIONEXUS_PROVISION_BRANCH_CODE?: string;
  BIONEXUS_PROVISION_BRANCH_NAME?: string;
  BIONEXUS_PROVISION_ADMIN_NAME?: string;
  BIONEXUS_PROVISION_ADMIN_USERNAME?: string;
  BIONEXUS_PROVISION_ADMIN_EMAIL?: string;
  BIONEXUS_PROVISION_ADMIN_PASSWORD?: string;
  BIONEXUS_PROVISION_SEED_PACKAGES?: string;
}

export interface ProvisionLaboratoryCommandInput {
  platformOwnerUsername: string;
  dto: CreatePlatformLaboratoryDto;
}

const required = (environment: ProvisionLaboratoryEnvironment, name: keyof ProvisionLaboratoryEnvironment): string => {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
};

export function resolveProvisionLaboratoryInput(environment: ProvisionLaboratoryEnvironment): ProvisionLaboratoryCommandInput {
  const password = required(environment, 'BIONEXUS_PROVISION_ADMIN_PASSWORD');
  const seedPackages = (environment.BIONEXUS_PROVISION_SEED_PACKAGES ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return {
    platformOwnerUsername: required(environment, 'BIONEXUS_PROVISION_OWNER_USERNAME').toLowerCase(),
    dto: {
      access_slug: required(environment, 'BIONEXUS_PROVISION_ACCESS_SLUG'),
      rif: required(environment, 'BIONEXUS_PROVISION_RIF'),
      name: required(environment, 'BIONEXUS_PROVISION_NAME'),
      businessName: required(environment, 'BIONEXUS_PROVISION_BUSINESS_NAME'),
      address: required(environment, 'BIONEXUS_PROVISION_ADDRESS'),
      plan_code: required(environment, 'BIONEXUS_PROVISION_PLAN_CODE'),
      subscription_status: required(environment, 'BIONEXUS_PROVISION_SUBSCRIPTION_STATUS') as CreatePlatformLaboratoryDto['subscription_status'],
      service_starts_at: required(environment, 'BIONEXUS_PROVISION_SERVICE_STARTS_AT'),
      service_expires_at: environment.BIONEXUS_PROVISION_SERVICE_EXPIRES_AT?.trim() || null,
      grace_until: environment.BIONEXUS_PROVISION_GRACE_UNTIL?.trim() || null,
      perpetual_free_reason: environment.BIONEXUS_PROVISION_PERPETUAL_FREE_REASON?.trim() || undefined,
      commercial_notes: environment.BIONEXUS_PROVISION_COMMERCIAL_NOTES?.trim() || undefined,
      phone: environment.BIONEXUS_PROVISION_PHONE?.trim() ?? '',
      email: environment.BIONEXUS_PROVISION_EMAIL?.trim() ?? '',
      branchCode: environment.BIONEXUS_PROVISION_BRANCH_CODE?.trim() || undefined,
      branchName: required(environment, 'BIONEXUS_PROVISION_BRANCH_NAME'),
      administratorName: required(environment, 'BIONEXUS_PROVISION_ADMIN_NAME'),
      administratorUsername: required(environment, 'BIONEXUS_PROVISION_ADMIN_USERNAME'),
      administratorEmail: environment.BIONEXUS_PROVISION_ADMIN_EMAIL?.trim() ?? '',
      administratorPassword: password,
      administratorPasswordConfirmation: password,
      seedPackages,
    },
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true, secret: 'provision-laboratory-context-only' }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => resolveDatabaseOptions({
        DB_HOST: configService.get<string>('DB_HOST'),
        DB_PORT: configService.get<string>('DB_PORT'),
        DB_USER: configService.get<string>('DB_USER'),
        DB_PASSWORD: configService.get<string>('DB_PASSWORD'),
        DB_DATABASE: configService.get<string>('DB_DATABASE'),
      }, __dirname),
    }),
    PlatformModule,
  ],
})
class ProvisionLaboratoryCommandModule {}

export async function provisionLaboratoryFromEnvironment(environment: ProvisionLaboratoryEnvironment = process.env): Promise<Record<string, unknown>> {
  const input = resolveProvisionLaboratoryInput(environment);
  const context = await NestFactory.createApplicationContext(ProvisionLaboratoryCommandModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const dataSource = context.get(DataSource);
    const provisioning = context.get(PlatformProvisioningService);
    const owners = await dataSource.query(
      'SELECT id FROM platform_owners WHERE lower(btrim(username))=lower(btrim($1)) AND is_active=true LIMIT 1',
      [input.platformOwnerUsername],
    );
    const platformOwnerId = Number(owners[0]?.id ?? 0);
    if (!Number.isInteger(platformOwnerId) || platformOwnerId <= 0) throw new Error('ACTIVE_PLATFORM_OWNER_NOT_FOUND');
    return await provisioning.provision(input.dto, platformOwnerId);
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  const result = await provisionLaboratoryFromEnvironment(process.env);
  process.stdout.write(JSON.stringify({
    success: true,
    laboratoryId: (result.laboratory as { id?: number })?.id,
    access_slug: (result.laboratory as { access_slug?: string })?.access_slug,
    branchId: (result.mainBranch as { id?: number })?.id,
    branchCode: (result.mainBranch as { code?: string })?.code,
    administratorId: (result.administrator as { id?: number })?.id,
    installedCatalogPackages: result.installedCatalogPackages,
  }) + '\n');
}

if (require.main === module) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'PROVISION_LABORATORY_FAILED'}\n`);
    process.exitCode = 1;
  });
}
