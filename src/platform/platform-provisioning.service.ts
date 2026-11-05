import { TenantCatalogPackageInstallerService } from './tenant-catalog-package-installer.service';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreatePlatformLaboratoryDto } from './dto/create-platform-laboratory.dto';
import { resolveGranularSeedPackages } from './seed-package-catalog';
import { normalizeLaboratoryAccessSlug } from '../laboratory/access-slug';
import { PlatformLaboratoryAuditService } from './platform-laboratory-audit.service';
import { runSerializableTransaction } from './serializable-transaction';

@Injectable()
export class PlatformProvisioningService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantPackages: TenantCatalogPackageInstallerService,
    private readonly audit: PlatformLaboratoryAuditService,
  ) {}

  async provision(input: CreatePlatformLaboratoryDto, platformOwnerId: number) {
    if(!Number.isInteger(platformOwnerId)||platformOwnerId<=0) throw new BadRequestException('PLATFORM_OWNER_CONTEXT_REQUIRED');
    const dto=this.validate(input, platformOwnerId);
    return runSerializableTransaction(this.dataSource, 'PLATFORM_PROVISIONING_CONCURRENT_RETRY_REQUIRED', async manager => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [81426001]);
      await this.ensureAvailable(manager,dto);
      const plans = dto.subscriptionStatus === 'perpetual_free' ? [] : await manager.query(
        `SELECT id,code,name,description,price,currency,billing_interval,grace_period_days,limits_benefits
         FROM platform_subscription_plans
         WHERE lower(btrim(code))=lower(btrim($1)) AND is_active=true
         FOR SHARE`,
        [dto.planCode],
      );
      if (dto.subscriptionStatus !== 'perpetual_free' && !plans[0]) {
        throw new NotFoundException('PLATFORM_SUBSCRIPTION_PLAN_NOT_FOUND_OR_INACTIVE');
      }
      const plan = plans[0] ?? {
        id: null,
        code: 'perpetual-free',
        name: 'Perpetual free',
        description: null,
        price: '0.00',
        currency: 'VES',
        billing_interval: null,
        grace_period_days: 0,
        limits_benefits: {},
      };
      const gracePeriodDays = Number(plan.grace_period_days);
      const graceUntil = dto.subscriptionStatus !== 'perpetual_free' && dto.serviceExpiresAt && gracePeriodDays > 0
        ? new Date(new Date(dto.serviceExpiresAt).getTime() + gracePeriodDays * 86400000).toISOString()
        : null;
      const perpetualFree = dto.subscriptionStatus === 'perpetual_free';
      const laboratory=(await manager.query(
        `INSERT INTO laboratory
          (access_slug,rif,name,business_name,address,phone_1,email,service_mode,plan_id,plan_code,plan_name,
           plan_description,plan_price,plan_currency,billing_interval,plan_limits_benefits,plan_grace_period_days,
           subscription_status,service_starts_at,service_expires_at,grace_until,perpetual_free_reason,
           perpetual_free_granted_at,perpetual_free_granted_by,commercial_notes,
           print_invoice,print_sample_take,invoice_number,voucher_number,creditnote_number,max_height_logo,
           max_width_logo,maximum_rows_report,rows_description_receipt,receipt_number,print_receipt)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'cloud',$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,
           $17,$18,$19,$20,$21,CASE WHEN $22::boolean THEN now() ELSE NULL END,
           CASE WHEN $22::boolean THEN $23::integer ELSE NULL END,$24,
           false,false,0,0,0,170,170,38,10,0,false)
         RETURNING id,access_slug,rif,name,business_name AS "businessName",address,service_mode,plan_id,
           plan_code,plan_name,plan_description,plan_price,plan_currency,billing_interval,
           plan_limits_benefits AS "planLimitsBenefits",plan_grace_period_days AS "planGracePeriodDays",
           subscription_status,service_starts_at,service_expires_at,grace_until,is_active`,
        [
          dto.access_slug,dto.rif,dto.name,dto.businessName,dto.address,dto.phone||null,dto.email||null,
          plan.id,plan.code,plan.name,plan.description,perpetualFree ? '0.00' : plan.price,
          plan.currency,plan.billing_interval,JSON.stringify(plan.limits_benefits ?? {}),gracePeriodDays,
          dto.subscriptionStatus,dto.serviceStartsAt,dto.serviceExpiresAt,graceUntil,
          perpetualFree ? dto.perpetualFreeReason : null,perpetualFree,platformOwnerId,dto.commercialNotes,
        ],
      ))[0];
      await manager.query(
        `INSERT INTO platform_subscriptions
          (laboratory_id,plan_id,plan_code,plan_name,plan_description,plan_price,plan_currency,billing_interval,
           plan_limits_benefits,grace_period_days,status,starts_at,expires_at,grace_until,perpetual_free_reason,
           perpetual_free_granted_at,perpetual_free_granted_by,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,
           CASE WHEN $16::boolean THEN now() ELSE NULL END,
           CASE WHEN $16::boolean THEN $17::integer ELSE NULL END,$17)`,
        [
          laboratory.id,plan.id,plan.code,plan.name,plan.description,perpetualFree ? '0.00' : plan.price,
          plan.currency,plan.billing_interval,JSON.stringify(plan.limits_benefits ?? {}),gracePeriodDays,
          dto.subscriptionStatus,dto.serviceStartsAt,dto.serviceExpiresAt,graceUntil,
          perpetualFree ? dto.perpetualFreeReason : null,perpetualFree,platformOwnerId,
        ],
      );
      const branch=(await manager.query(`INSERT INTO laboratory_branches (laboratory_id,code,name,address,phone,email,is_main,is_active,display_order) VALUES ($1,$2,$3,$4,$5,$6,true,true,0) RETURNING id,code,name`,[laboratory.id,dto.branchCode,dto.branchName,dto.address,dto.phone||null,dto.email||null]))[0];
      const installedCatalogPackages = await this.tenantPackages.installSelected(manager, Number(laboratory.id), dto.seedPackages, platformOwnerId);
      const currency=(await manager.query(`SELECT id FROM currencies WHERE laboratory_id=$1 AND upper(btrim(code))='VES' AND is_active=true ORDER BY id LIMIT 1`,[laboratory.id]))[0];
      if(!currency) throw new BadRequestException('PLATFORM_PROVISIONING_VES_CURRENCY_REQUIRED');
      await manager.query(`INSERT INTO application_settings (laboratory_id,financial_primary_currency_id,voucher_format,receipt_format,head_html,body_html,page_html,workshee_format,printer_type,printer_interface) VALUES ($1,$2,'','','','','','','','')`,[laboratory.id,currency.id]);
      const role=(await manager.query(`INSERT INTO security_roles (laboratory_id,code,name,description,is_system,is_active) VALUES ($1,'administrator','Administrador','Administrador inicial del laboratorio',true,true) RETURNING id`,[laboratory.id]))[0];
      await manager.query(`INSERT INTO security_role_permissions (laboratory_id,role_id,permission_id) SELECT $1,$2,p.id FROM security_permissions p WHERE p.is_active=true`,[laboratory.id,role.id]);
      const passwordHash=await bcrypt.hash(dto.administratorPassword,8);
      const user=(await manager.query(`INSERT INTO users (laboratory_id,password,name,user_name,telephone,email,roles,request_password,hide_user) VALUES ($1,$2,$3,$4,'',$5,'administrator',true,false) RETURNING id,name,user_name AS username`,[laboratory.id,passwordHash,dto.administratorName,dto.administratorUsername,dto.administratorEmail||null]))[0];
      await manager.query(`INSERT INTO security_user_roles (laboratory_id,user_id,role_id) VALUES ($1,$2,$3)`,[laboratory.id,user.id,role.id]);
      await this.audit.write(manager, {
        laboratoryId: Number(laboratory.id),
        platformOwnerId,
        action: 'platform.laboratory.created',
        summary: 'Platform owner created a Cloud laboratory',
        metadata: {
          accessSlug: laboratory.access_slug,
          planCode: dto.planCode,
          subscriptionStatus: dto.subscriptionStatus,
          serviceStartsAt: dto.serviceStartsAt,
          serviceExpiresAt: dto.serviceExpiresAt,
          graceUntil,
          planSnapshot: {
            planId: plan.id,
            code: plan.code,
            name: plan.name,
            price: perpetualFree ? '0.00' : plan.price,
            currency: plan.currency,
            billingInterval: plan.billing_interval,
            gracePeriodDays,
            limitsBenefits: plan.limits_benefits ?? {},
          },
          perpetualFreeReason: dto.perpetualFreeReason,
        },
      });
      return { laboratory, mainBranch:branch, administrator:{id:user.id,name:user.name,username:user.username}, installedCatalogPackages };
    });
  }

  private async ensureAvailable(manager:EntityManager,dto:ReturnType<PlatformProvisioningService['validate']>) {
    const duplicate=(await manager.query(`SELECT EXISTS(SELECT 1 FROM laboratory WHERE upper(btrim(rif))=upper(btrim($1))) rif, EXISTS(SELECT 1 FROM laboratory WHERE lower(btrim(access_slug))=lower(btrim($2))) access_slug`,[dto.rif,dto.access_slug]))[0];
    if(duplicate.rif) throw new ConflictException('PLATFORM_PROVISIONING_RIF_EXISTS');
    if(duplicate.access_slug) throw new ConflictException('PLATFORM_PROVISIONING_ACCESS_SLUG_EXISTS');
  }

  private validate(input:CreatePlatformLaboratoryDto, platformOwnerId: number) {
    const text=(value:unknown,max:number,code:string)=>{const normalized=typeof value==='string'?value.trim():'';if(!normalized||normalized.length>max)throw new BadRequestException(code);return normalized};
    const rif=text(input?.rif,20,'PLATFORM_PROVISIONING_RIF_REQUIRED').toUpperCase();
    if(!/^[VEJG]-?\d{7,9}-?\d$/i.test(rif)) throw new BadRequestException('PLATFORM_PROVISIONING_RIF_INVALID');
    if (typeof input?.access_slug !== 'string' || !input.access_slug.trim()) throw new BadRequestException('PLATFORM_PROVISIONING_ACCESS_SLUG_REQUIRED');
    const access_slug = normalizeLaboratoryAccessSlug(input.access_slug);
    if (!access_slug) throw new BadRequestException('PLATFORM_PROVISIONING_ACCESS_SLUG_INVALID');
    const password=typeof input?.administratorPassword==='string'?input.administratorPassword:'';
    const passwordConfirmation=typeof input?.administratorPasswordConfirmation==='string'?input.administratorPasswordConfirmation:'';
    if(password!==passwordConfirmation) throw new BadRequestException('PLATFORM_PROVISIONING_PASSWORD_CONFIRMATION_MISMATCH');
    if(password.length<12||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)||!(/[^A-Za-z0-9]/.test(password))) throw new BadRequestException('PLATFORM_PROVISIONING_PASSWORD_INVALID');
    const subscription = this.validateSubscription(input, platformOwnerId);
    const requestedPackages = input.seedPackages ?? [];
    if (!Array.isArray(requestedPackages) || requestedPackages.some((value) => typeof value !== 'string')) throw new BadRequestException('PLATFORM_PROVISIONING_SEED_PACKAGES_INVALID');
    const seedPackages = resolveGranularSeedPackages(requestedPackages);
    const branchCode = input.branchCode == null || (typeof input.branchCode === 'string' && !input.branchCode.trim())
      ? 'PRINCIPAL'
      : text(input.branchCode, 30, 'PLATFORM_PROVISIONING_BRANCH_CODE_INVALID').toUpperCase();
    return {access_slug,rif,name:text(input.name,50,'PLATFORM_PROVISIONING_NAME_REQUIRED'),businessName:text(input.businessName,100,'PLATFORM_PROVISIONING_BUSINESS_NAME_REQUIRED'),address:text(input.address,200,'PLATFORM_PROVISIONING_ADDRESS_REQUIRED'),phone:typeof input.phone==='string'?input.phone.trim():'',email:typeof input.email==='string'?input.email.trim().toLowerCase():'',branchCode,branchName:text(input.branchName,100,'PLATFORM_PROVISIONING_BRANCH_NAME_REQUIRED'),administratorName:text(input.administratorName,100,'PLATFORM_PROVISIONING_ADMIN_NAME_REQUIRED'),administratorUsername:text(input.administratorUsername,100,'PLATFORM_PROVISIONING_ADMIN_USERNAME_REQUIRED').toLowerCase(),administratorEmail:typeof input.administratorEmail==='string'?input.administratorEmail.trim().toLowerCase():'',administratorPassword:password,administratorPasswordConfirmation:passwordConfirmation,seedPackages,...subscription};
  }

  private validateSubscription(input: CreatePlatformLaboratoryDto, ownerId: number) {
    const subscriptionStatus = input?.subscription_status;
    if (!['trial', 'active', 'perpetual_free'].includes(subscriptionStatus)) {
      throw new BadRequestException('PLATFORM_SUBSCRIPTION_STATUS_INVALID');
    }
    const requestedPlanCode = typeof input?.plan_code === 'string' ? input.plan_code.trim() : '';
    const planCode = subscriptionStatus === 'perpetual_free'
      ? 'perpetual-free'
      : requestedPlanCode.toLowerCase();
    if (!planCode || planCode.length > 80) throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_REQUIRED');
    const timestamp = (value: unknown, required: boolean, code: string): string | null => {
      if (value == null || value === '') {
        if (required) throw new BadRequestException(code);
        return null;
      }
      if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) throw new BadRequestException(code);
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) throw new BadRequestException(code);
      return parsed.toISOString();
    };
    const serviceStartsAt = timestamp(input.service_starts_at, true, 'PLATFORM_SUBSCRIPTION_START_INVALID');
    const serviceExpiresAt = timestamp(input.service_expires_at, subscriptionStatus !== 'perpetual_free', 'PLATFORM_SUBSCRIPTION_EXPIRY_REQUIRED');
    if (serviceExpiresAt && new Date(serviceExpiresAt) <= new Date(serviceStartsAt!)) {
      throw new BadRequestException('PLATFORM_SUBSCRIPTION_DATES_INVALID');
    }
    const perpetualFreeReason = typeof input.perpetual_free_reason === 'string' ? input.perpetual_free_reason.trim() : '';
    if (subscriptionStatus === 'perpetual_free' && !perpetualFreeReason) {
      throw new BadRequestException('PLATFORM_PERPETUAL_FREE_REASON_REQUIRED');
    }
    return {
      planCode,
      subscriptionStatus,
      serviceStartsAt,
      serviceExpiresAt,
      perpetualFreeReason: subscriptionStatus === 'perpetual_free' ? perpetualFreeReason : null,
      commercialNotes: typeof input.commercial_notes === 'string' ? input.commercial_notes.trim() || null : null,
      platformOwnerId: ownerId,
    };
  }

}
