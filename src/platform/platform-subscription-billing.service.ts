import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { PlatformPaymentProofStorageService, PaymentProofUpload } from './platform-payment-proof-storage.service';
import { runSerializableTransaction } from './serializable-transaction';

const PLAN_TYPES = ['trial', 'paid'] as const;
const PLAN_INTERVAL_UNITS = ['day', 'month', 'year'] as const;
const PLAN_FIELDS = new Set([
  'code',
  'name',
  'description',
  'price',
  'currency',
  'planType',
  'intervalUnit',
  'intervalCount',
  'gracePeriodDays',
  'limitsBenefits',
  'isActive',
]);

export interface SubscriptionPlanInput {
  code?: unknown;
  name?: unknown;
  description?: unknown;
  price?: unknown;
  currency?: unknown;
  planType?: unknown;
  intervalUnit?: unknown;
  intervalCount?: unknown;
  gracePeriodDays?: unknown;
  limitsBenefits?: unknown;
  isActive?: unknown;
}

export interface SubscriptionAssignmentInput {
  planCode?: unknown;
  status?: unknown;
  startsAt?: unknown;
  perpetualFreeReason?: unknown;
}

export interface SubscriptionStatusInput {
  status?: unknown;
  reason?: unknown;
}

export interface ManualSubscriptionPaymentInput {
  idempotencyKey?: unknown;
  paidAt?: unknown;
  amount?: unknown;
  currency?: unknown;
  method?: unknown;
  reference?: unknown;
  periodStart?: unknown;
  periodEnd?: unknown;
}

@Injectable()
export class PlatformSubscriptionBillingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly proofStorage: PlatformPaymentProofStorageService,
  ) {}

  async listGlobalActiveCurrencies() {
    return this.dataSource.query(`SELECT id,upper(btrim(code)) AS code,name,symbol,is_active AS "isActive"
      FROM currencies WHERE laboratory_id IS NULL AND is_platform_managed=true AND is_active=true
      ORDER BY display_order,name,id`);
  }

  private async assertGlobalActiveCurrency(currency: string) {
    const rows = await this.dataSource.query(`SELECT id FROM currencies
      WHERE laboratory_id IS NULL AND is_platform_managed=true AND is_active=true
        AND upper(btrim(code))=$1 LIMIT 1`, [currency]);
    if (!rows[0]) throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_CURRENCY_NOT_FOUND_OR_INACTIVE');
  }

  async listPlans(includeInactive = true) {
    return this.dataSource.query(
      `SELECT id AS "planId",code,name,description,price,currency,billing_interval AS "billingInterval",plan_type AS "planType",interval_unit AS "intervalUnit",interval_count AS "intervalCount",
        grace_period_days AS "gracePeriodDays",limits_benefits AS "limitsBenefits",is_active AS "isActive",
        created_at AS "createdAt",updated_at AS "updatedAt"
       FROM platform_subscription_plans
       ${includeInactive ? '' : 'WHERE is_active=true'}
       ORDER BY is_active DESC,lower(name),id`,
    );
  }

  async createPlan(input: SubscriptionPlanInput, ownerId: number) {
    this.validateOwnerId(ownerId);
    const plan = this.validatePlan(input, false);
    await this.assertGlobalActiveCurrency(plan.currency);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const rows = await manager.query(
          `INSERT INTO platform_subscription_plans
            (code,name,description,price,currency,billing_interval,plan_type,interval_unit,interval_count,grace_period_days,limits_benefits,is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
           RETURNING id AS "planId",code,name,description,price,currency,billing_interval AS "billingInterval",plan_type AS "planType",interval_unit AS "intervalUnit",interval_count AS "intervalCount",
             grace_period_days AS "gracePeriodDays",limits_benefits AS "limitsBenefits",is_active AS "isActive",
             created_at AS "createdAt",updated_at AS "updatedAt"`,
          [
            plan.code,
            plan.name,
            plan.description,
            plan.price,
            plan.currency,
            plan.billingInterval,
            plan.planType,
            plan.intervalUnit,
            plan.intervalCount,
            plan.gracePeriodDays,
            JSON.stringify(plan.limitsBenefits),
            plan.isActive,
          ],
        );
        await this.writeBillingAudit(manager, {
          ownerId,
          subjectType: 'plan',
          subjectId: Number(rows[0].planId),
          action: 'platform.subscription-plan.created',
          summary: 'Platform owner created a subscription plan',
          metadata: { plan: this.planAuditSnapshot(rows[0]) },
        });
        return rows[0];
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('PLATFORM_SUBSCRIPTION_PLAN_CODE_EXISTS');
      throw error;
    }
  }

  async updatePlan(planId: number, input: SubscriptionPlanInput, ownerId: number) {
    this.validateOwnerId(ownerId);
    this.validateId(planId, 'PLATFORM_SUBSCRIPTION_PLAN_ID_INVALID');
    const keys = Object.keys(input ?? {});
    if (!keys.length || keys.some((key) => !PLAN_FIELDS.has(key))) {
      throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_FIELDS_INVALID');
    }
    const patch = this.validatePlan(input, true);
    if (patch.currency !== undefined) await this.assertGlobalActiveCurrency(patch.currency);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const existingRows = await manager.query(
          `SELECT id AS "planId",code,name,description,price,currency,billing_interval AS "billingInterval",plan_type AS "planType",interval_unit AS "intervalUnit",interval_count AS "intervalCount",
            grace_period_days AS "gracePeriodDays",limits_benefits AS "limitsBenefits",is_active AS "isActive"
           FROM platform_subscription_plans WHERE id=$1 FOR UPDATE`,
          [planId],
        );
        const before = existingRows[0];
        if (!before) throw new NotFoundException('PLATFORM_SUBSCRIPTION_PLAN_NOT_FOUND');
        const columns: Record<string, string> = {
          code: 'code',
          name: 'name',
          description: 'description',
          price: 'price',
          currency: 'currency',
          planType: 'plan_type',
          intervalUnit: 'interval_unit',
          intervalCount: 'interval_count',
          gracePeriodDays: 'grace_period_days',
          limitsBenefits: 'limits_benefits',
          isActive: 'is_active',
        };
        const values: unknown[] = [];
        const assignments = keys.map((key) => {
          const column = columns[key];
          const value = patch[key as keyof typeof patch];
          values.push(key === 'limitsBenefits' ? JSON.stringify(value) : value);
          return `"${column}"=$${values.length}${key === 'limitsBenefits' ? '::jsonb' : ''}`;
        });
        assignments.push('"updated_at"=now()');
        values.push(planId);
        const updatedRows = await manager.query(
          `UPDATE platform_subscription_plans SET ${assignments.join(',')}
           WHERE id=$${values.length}
           RETURNING id AS "planId",code,name,description,price,currency,billing_interval AS "billingInterval",plan_type AS "planType",interval_unit AS "intervalUnit",interval_count AS "intervalCount",
             grace_period_days AS "gracePeriodDays",limits_benefits AS "limitsBenefits",is_active AS "isActive",
             created_at AS "createdAt",updated_at AS "updatedAt"`,
          values,
        );
        await this.writeBillingAudit(manager, {
          ownerId,
          subjectType: 'plan',
          subjectId: planId,
          action: 'platform.subscription-plan.updated',
          summary: 'Platform owner updated a subscription plan',
          metadata: { before: this.planAuditSnapshot(before), after: this.planAuditSnapshot(updatedRows[0]) },
        });
        return updatedRows[0];
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('PLATFORM_SUBSCRIPTION_PLAN_CODE_EXISTS');
      throw error;
    }
  }

  async getSubscription(laboratoryId: number) {
    this.validateId(laboratoryId, 'PLATFORM_LABORATORY_ID_INVALID');
    const rows = await this.dataSource.query(
      `SELECT id AS "subscriptionId",laboratory_id AS "laboratoryId",plan_id AS "planId",
        plan_code AS "planCode",plan_name AS "planName",plan_description AS "planDescription",
        plan_price AS "planPrice",plan_currency AS "planCurrency",billing_interval AS "billingInterval",plan_type AS "planType",interval_unit AS "intervalUnit",interval_count AS "intervalCount",plan_type AS "planType",interval_unit AS "intervalUnit",interval_count AS "intervalCount",
        plan_limits_benefits AS "limitsBenefits",grace_period_days AS "gracePeriodDays",
        status,starts_at AS "startsAt",expires_at AS "expiresAt",grace_until AS "graceUntil",
        perpetual_free_reason AS "perpetualFreeReason",perpetual_free_granted_at AS "perpetualFreeGrantedAt",
        perpetual_free_granted_by AS "perpetualFreeGrantedBy",suspension_reason AS "suspensionReason",
        status_reason AS "statusReason",is_current AS "isCurrent",created_at AS "createdAt",ended_at AS "endedAt"
       FROM platform_subscriptions WHERE laboratory_id=$1 AND is_current=true`,
      [laboratoryId],
    );
    if (rows[0]) return rows[0];
    const laboratory = await this.dataSource.query(
      `SELECT NULL::bigint AS "subscriptionId",id AS "laboratoryId",plan_id AS "planId",
        plan_code AS "planCode",plan_name AS "planName",
        plan_description AS "planDescription",plan_price AS "planPrice",plan_currency AS "planCurrency",
        billing_interval AS "billingInterval",plan_type AS "planType",interval_unit AS "intervalUnit",interval_count AS "intervalCount",plan_limits_benefits AS "limitsBenefits",
        plan_grace_period_days AS "gracePeriodDays",subscription_status AS status,
        service_starts_at AS "startsAt",service_expires_at AS "expiresAt",grace_until AS "graceUntil",
        perpetual_free_reason AS "perpetualFreeReason",perpetual_free_granted_at AS "perpetualFreeGrantedAt",
        perpetual_free_granted_by AS "perpetualFreeGrantedBy",suspension_reason AS "suspensionReason",
        NULL::text AS "statusReason",true AS "isCurrent",NULL::timestamptz AS "createdAt",
        NULL::timestamptz AS "endedAt"
       FROM laboratory WHERE id=$1`,
      [laboratoryId],
    );
    if (!laboratory[0]) throw new NotFoundException('PLATFORM_LABORATORY_NOT_FOUND');
    return laboratory[0];
  }

  async assignPlan(laboratoryId: number, input: SubscriptionAssignmentInput, ownerId: number) {
    this.validateOwnerId(ownerId);
    this.validateId(laboratoryId, 'PLATFORM_LABORATORY_ID_INVALID');
    const requestedStatus = input?.status;
    if (requestedStatus !== undefined && requestedStatus !== 'perpetual_free') {
      throw new BadRequestException('PLATFORM_SUBSCRIPTION_STATUS_DERIVED_FROM_PLAN');
    }
    const startsAt = this.parseTimestamp(input.startsAt, true, 'PLATFORM_SUBSCRIPTION_START_INVALID')!;
    const perpetualFree = requestedStatus === 'perpetual_free';
    let expiresAt: Date | null = null;
    const reason = perpetualFree ? this.requiredText(input.perpetualFreeReason, 2000, 'PLATFORM_PERPETUAL_FREE_REASON_REQUIRED') : null;
    const planCode = perpetualFree ? 'perpetual-free' : this.requiredText(input.planCode, 80, 'PLATFORM_SUBSCRIPTION_PLAN_REQUIRED').toLowerCase();

    await runSerializableTransaction(this.dataSource, 'PLATFORM_SUBSCRIPTION_CONCURRENT_RETRY_REQUIRED', async (manager) => {
      const labs = await manager.query(`SELECT id FROM laboratory WHERE id=$1 FOR UPDATE`, [laboratoryId]);
      if (!labs[0]) throw new NotFoundException('PLATFORM_LABORATORY_NOT_FOUND');
      const planRows = perpetualFree ? [] : await manager.query(
        `SELECT id,code,name,description,price,currency,billing_interval,plan_type,interval_unit,interval_count,grace_period_days,limits_benefits
         FROM platform_subscription_plans WHERE lower(btrim(code))=lower(btrim($1)) AND is_active=true FOR UPDATE`,
        [planCode],
      );
      if (!perpetualFree && !planRows[0]) throw new NotFoundException('PLATFORM_SUBSCRIPTION_PLAN_NOT_FOUND_OR_INACTIVE');
      const plan = planRows[0] ?? {
        id: null,
        code: planCode,
        name: 'Perpetual free',
        description: null,
        price: '0.00',
        currency: 'VES',
        billing_interval: null,
        grace_period_days: 0,
        limits_benefits: {},
      };
      const derivedStatus = perpetualFree ? 'perpetual_free' : plan.plan_type === 'trial' ? 'trial' : 'active';
      if (!perpetualFree) expiresAt = this.addPlanDuration(startsAt, plan.interval_unit, Number(plan.interval_count));
      const graceDays = perpetualFree ? 0 : Number(plan.grace_period_days);
      const graceUntil = !perpetualFree && expiresAt && graceDays > 0
        ? new Date(expiresAt.getTime() + graceDays * 86400000)
        : null;
      if (graceUntil && Number.isNaN(graceUntil.getTime())) {
        throw new BadRequestException('PLATFORM_SUBSCRIPTION_GRACE_INVALID');
      }
      const before = await manager.query(
        `SELECT id,plan_code AS "planCode",status,starts_at AS "startsAt",expires_at AS "expiresAt",
          grace_until AS "graceUntil",grace_period_days AS "gracePeriodDays",is_current AS "isCurrent"
         FROM platform_subscriptions WHERE laboratory_id=$1 AND is_current=true FOR UPDATE`,
        [laboratoryId],
      );
      await manager.query(
        `UPDATE platform_subscriptions SET is_current=false,ended_at=now()
         WHERE laboratory_id=$1 AND is_current=true`,
        [laboratoryId],
      );
      const created = await manager.query(
        `INSERT INTO platform_subscriptions
          (laboratory_id,plan_id,plan_code,plan_name,plan_description,plan_price,plan_currency,billing_interval,plan_type,interval_unit,interval_count,
           plan_limits_benefits,grace_period_days,status,starts_at,expires_at,grace_until,
           perpetual_free_reason,perpetual_free_granted_at,perpetual_free_granted_by,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17,$18,
           CASE WHEN $16::boolean THEN now() ELSE NULL END,
           CASE WHEN $16::boolean THEN $17::integer ELSE NULL END,$17)
         RETURNING id`,
        [
          laboratoryId,
          plan.id,
          plan.code,
          plan.name,
          plan.description,
          perpetualFree ? '0.00' : plan.price,
          plan.currency,
          plan.billing_interval,
          perpetualFree ? null : plan.plan_type,
          perpetualFree ? null : plan.interval_unit,
          perpetualFree ? null : plan.interval_count,
          JSON.stringify(plan.limits_benefits ?? {}),
          graceDays,
          derivedStatus,
          startsAt,
          expiresAt,
          graceUntil,
          reason,
          perpetualFree,
          ownerId,
        ],
      );
      await manager.query(
        `UPDATE laboratory SET plan_id=$2,plan_code=$3,plan_name=$4,plan_description=$5,plan_price=$6,
          plan_currency=$7,billing_interval=$8,plan_type=$9,interval_unit=$10,interval_count=$11,plan_limits_benefits=$12::jsonb,plan_grace_period_days=$13,
          subscription_status=$14,service_starts_at=$15,service_expires_at=$16,grace_until=$17,
          perpetual_free_reason=$18,perpetual_free_granted_at=CASE WHEN $19::boolean THEN now() ELSE NULL END,
          perpetual_free_granted_by=CASE WHEN $19::boolean THEN $20::integer ELSE NULL END,
          suspension_reason=NULL,suspended_at=NULL
         WHERE id=$1`,
        [
          laboratoryId,
          plan.id,
          plan.code,
          plan.name,
          plan.description,
          perpetualFree ? '0.00' : plan.price,
          plan.currency,
          plan.billing_interval,
          perpetualFree ? null : plan.plan_type,
          perpetualFree ? null : plan.interval_unit,
          perpetualFree ? null : plan.interval_count,
          JSON.stringify(plan.limits_benefits ?? {}),
          graceDays,
          derivedStatus,
          startsAt,
          expiresAt,
          graceUntil,
          reason,
          perpetualFree,
          ownerId,
        ],
      );
      await this.writeBillingAudit(manager, {
        ownerId,
        laboratoryId,
        subjectType: 'subscription',
        subjectId: Number(created[0].id),
        action: 'platform.subscription.assigned',
        summary: 'Platform owner assigned a subscription plan',
        metadata: {
          before: before[0] ? this.subscriptionAuditSnapshot(before[0]) : null,
          after: {
            planCode: plan.code,
            planName: plan.name,
            planPrice: perpetualFree ? '0.00' : plan.price,
            planCurrency: plan.currency,
            billingInterval: plan.billing_interval,
            gracePeriodDays: graceDays,
            status: derivedStatus,
            startsAt,
            expiresAt,
            graceUntil,
            perpetualFreeReason: reason,
          },
        },
      });
    });
    return { subscription: await this.getSubscription(laboratoryId) };
  }

  async changeStatus(laboratoryId: number, input: SubscriptionStatusInput, ownerId: number) {
    this.validateOwnerId(ownerId);
    this.validateId(laboratoryId, 'PLATFORM_LABORATORY_ID_INVALID');
    const status = input?.status;
    if (!['trial', 'active', 'grace', 'suspended', 'cancelled'].includes(status as string)) {
      throw new BadRequestException('PLATFORM_SUBSCRIPTION_STATUS_INVALID');
    }
    const reason = this.optionalText(input.reason, 2000);
    if (['suspended', 'cancelled'].includes(status as string) && !reason) {
      throw new BadRequestException('PLATFORM_SUBSCRIPTION_STATUS_REASON_REQUIRED');
    }
    await runSerializableTransaction(this.dataSource, 'PLATFORM_SUBSCRIPTION_CONCURRENT_RETRY_REQUIRED', async (manager) => {
      const rows = await manager.query(
        `SELECT * FROM platform_subscriptions WHERE laboratory_id=$1 AND is_current=true FOR UPDATE`,
        [laboratoryId],
      );
      const current = rows[0];
      if (!current) throw new NotFoundException('PLATFORM_SUBSCRIPTION_NOT_FOUND');
      if (current.status === 'perpetual_free') throw new ConflictException('PLATFORM_PERPETUAL_FREE_TRANSITION_FORBIDDEN');
      const transitions: Record<string, string[]> = {
        trial: ['active', 'grace', 'suspended', 'cancelled'],
        active: ['trial', 'grace', 'suspended', 'cancelled'],
        grace: ['active', 'suspended', 'cancelled'],
        suspended: ['active', 'cancelled'],
        cancelled: [],
      };
      if (status !== current.status && !transitions[current.status]?.includes(status as string)) {
        throw new ConflictException('PLATFORM_SUBSCRIPTION_TRANSITION_INVALID');
      }
      const now = new Date();
      if (status === 'grace' && (
        !current.grace_until ||
        new Date(current.expires_at).getTime() >= now.getTime() ||
        new Date(current.grace_until).getTime() < now.getTime()
      )) {
        throw new ConflictException('PLATFORM_SUBSCRIPTION_GRACE_UNAVAILABLE');
      }
      await manager.query(
        `UPDATE platform_subscriptions SET status=$2,status_reason=$3,
          suspension_reason=CASE WHEN $2='suspended' THEN $3 ELSE NULL END,
          suspended_at=CASE WHEN $2='suspended' THEN COALESCE(suspended_at,now()) ELSE NULL END,
          cancelled_at=CASE WHEN $2='cancelled' THEN COALESCE(cancelled_at,now()) ELSE NULL END
         WHERE id=$1`,
        [current.id, status, reason],
      );
      await manager.query(
        `UPDATE laboratory SET subscription_status=$2,
          suspension_reason=CASE WHEN $2='suspended' THEN $3 ELSE NULL END,
          suspended_at=CASE WHEN $2='suspended' THEN COALESCE(suspended_at,$4) ELSE NULL END
         WHERE id=$1`,
        [laboratoryId, status, reason, now],
      );
      await this.writeBillingAudit(manager, {
        ownerId,
        laboratoryId,
        subjectType: 'subscription',
        subjectId: Number(current.id),
        action: 'platform.subscription.status.changed',
        summary: 'Platform owner changed subscription status',
        metadata: { before: this.subscriptionAuditSnapshot(current), after: { status, reason } },
      });
    });
    return { subscription: await this.getSubscription(laboratoryId) };
  }

  async listPayments(laboratoryId: number) {
    this.validateId(laboratoryId, 'PLATFORM_LABORATORY_ID_INVALID');
    const exists = await this.dataSource.query(`SELECT id FROM laboratory WHERE id=$1`, [laboratoryId]);
    if (!exists[0]) throw new NotFoundException('PLATFORM_LABORATORY_NOT_FOUND');
    return this.dataSource.query(
      `SELECT id AS "paymentId",subscription_id AS "subscriptionId",laboratory_id AS "laboratoryId",paid_at AS "paidAt",
        amount,currency,method,reference,period_start AS "periodStart",period_end AS "periodEnd",
        (proof_storage_key IS NOT NULL) AS "hasProof",recorded_by AS "recordedBy",created_at AS "createdAt"
       FROM platform_subscription_payments WHERE laboratory_id=$1 ORDER BY paid_at DESC,id DESC`,
      [laboratoryId],
    );
  }

  async recordPayment(
    laboratoryId: number,
    input: ManualSubscriptionPaymentInput,
    ownerId: number,
    proof?: PaymentProofUpload,
  ) {
    this.validateOwnerId(ownerId);
    this.validateId(laboratoryId, 'PLATFORM_LABORATORY_ID_INVALID');
    const payment = this.validatePayment(input);
    const alreadyRecorded = await this.findIdempotentPayment(laboratoryId, payment);
    if (alreadyRecorded) return { payment: alreadyRecorded };
    const storedProof = proof ? await this.proofStorage.store(proof) : null;
    try {
      const result = await runSerializableTransaction(
        this.dataSource,
        'PLATFORM_SUBSCRIPTION_PAYMENT_CONCURRENT_RETRY_REQUIRED',
        async (manager) => {
        const duplicateRows = await manager.query(
          `SELECT id AS "paymentId",subscription_id AS "subscriptionId",laboratory_id AS "laboratoryId",
            paid_at AS "paidAt",amount,currency,method,reference,period_start AS "periodStart",
            period_end AS "periodEnd",(proof_storage_key IS NOT NULL) AS "hasProof",
            recorded_by AS "recordedBy",created_at AS "createdAt"
           FROM platform_subscription_payments WHERE laboratory_id=$1 AND idempotency_key=$2 FOR UPDATE`,
          [laboratoryId, payment.idempotencyKey],
        );
        if (duplicateRows[0]) {
          this.assertSameIdempotentPayment(duplicateRows[0], payment);
          return { payment: duplicateRows[0], duplicate: true };
        }
        const rows = await manager.query(
          `SELECT * FROM platform_subscriptions WHERE laboratory_id=$1 AND is_current=true FOR UPDATE`,
          [laboratoryId],
        );
        const subscription = rows[0];
        if (!subscription) throw new NotFoundException('PLATFORM_SUBSCRIPTION_NOT_FOUND');
        if (['cancelled', 'perpetual_free'].includes(subscription.status)) {
          throw new ConflictException('PLATFORM_SUBSCRIPTION_PAYMENT_NOT_ALLOWED');
        }
        const inserted = await manager.query(
          `INSERT INTO platform_subscription_payments
            (subscription_id,laboratory_id,paid_at,amount,currency,method,reference,period_start,period_end,idempotency_key,
             proof_storage_key,proof_content_type,recorded_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           RETURNING id AS "paymentId",subscription_id AS "subscriptionId",laboratory_id AS "laboratoryId",
             paid_at AS "paidAt",amount,currency,method,reference,period_start AS "periodStart",
             period_end AS "periodEnd",(proof_storage_key IS NOT NULL) AS "hasProof",
             recorded_by AS "recordedBy",created_at AS "createdAt"`,
          [
            subscription.id,
            laboratoryId,
            payment.paidAt,
            payment.amount,
            payment.currency,
            payment.method,
            payment.reference,
            payment.periodStart,
            payment.periodEnd,
            payment.idempotencyKey,
            storedProof?.storageKey ?? null,
            storedProof?.contentType ?? null,
            ownerId,
          ],
        );
        const graceDays = Number(subscription.grace_period_days ?? 0);
        const graceUntil = graceDays > 0
          ? new Date(payment.periodEnd.getTime() + graceDays * 86400000)
          : null;
        if (graceUntil && Number.isNaN(graceUntil.getTime())) {
          throw new BadRequestException('PLATFORM_SUBSCRIPTION_GRACE_INVALID');
        }
        const existingStartsAt = new Date(subscription.starts_at);
        const resultStartsAt = existingStartsAt <= payment.periodStart ? existingStartsAt : payment.periodStart;
        await manager.query(
          `UPDATE platform_subscriptions SET status='active',starts_at=LEAST(starts_at,$2),
            expires_at=$3,grace_until=$4,status_reason=NULL,suspension_reason=NULL,suspended_at=NULL,
            cancelled_at=NULL
           WHERE id=$1`,
          [subscription.id, resultStartsAt, payment.periodEnd, graceUntil],
        );
        await manager.query(
          `UPDATE laboratory SET subscription_status='active',
            service_starts_at=LEAST(COALESCE(service_starts_at,$2),$2),
            service_expires_at=$3,grace_until=$4,suspension_reason=NULL,suspended_at=NULL
           WHERE id=$1`,
          [laboratoryId, resultStartsAt, payment.periodEnd, graceUntil],
        );
        await this.writeBillingAudit(manager, {
          ownerId,
          laboratoryId,
          subjectType: 'payment',
          subjectId: Number(inserted[0].paymentId),
          action: 'platform.subscription.payment.recorded',
          summary: 'Platform owner recorded a manual subscription payment',
          metadata: {
            before: {
              status: subscription.status,
              startsAt: subscription.starts_at,
              expiresAt: subscription.expires_at,
              graceUntil: subscription.grace_until,
            },
            subscriptionId: Number(subscription.id),
            paidAt: payment.paidAt,
            amount: payment.amount,
            currency: payment.currency,
            method: payment.method,
            reference: payment.reference,
            periodStart: payment.periodStart,
            periodEnd: payment.periodEnd,
            hasProof: Boolean(storedProof),
            resultingGraceUntil: graceUntil,
            after: {
              status: 'active',
              startsAt: resultStartsAt,
              expiresAt: payment.periodEnd,
              graceUntil,
            },
          },
          },
        );
        return { payment: inserted[0], duplicate: false };
      });
      if (result.duplicate && storedProof) await this.proofStorage.remove(storedProof.storageKey);
      return { payment: result.payment };
    } catch (error) {
      if (storedProof) {
        try {
          await this.proofStorage.remove(storedProof.storageKey);
        } catch (cleanupError) {
          throw new InternalServerErrorException('PLATFORM_PAYMENT_RECORD_AND_PROOF_CLEANUP_FAILED', {
            cause: { recordError: error, cleanupError },
          });
        }
      }
      if (this.isUniqueViolation(error)) {
        const duplicate = await this.findIdempotentPayment(laboratoryId, payment);
        if (duplicate) return { payment: duplicate };
      }
      if (this.isUniqueViolation(error)) throw new ConflictException('PLATFORM_SUBSCRIPTION_PAYMENT_REFERENCE_EXISTS');
      throw error;
    }
  }

  async downloadPaymentProof(laboratoryId: number, paymentId: number) {
    this.validateId(laboratoryId, 'PLATFORM_LABORATORY_ID_INVALID');
    this.validateId(paymentId, 'PLATFORM_SUBSCRIPTION_PAYMENT_ID_INVALID');
    const rows = await this.dataSource.query(
      `SELECT proof_storage_key AS "storageKey",proof_content_type AS "contentType"
       FROM platform_subscription_payments WHERE laboratory_id=$1 AND id=$2`,
      [laboratoryId, paymentId],
    );
    if (!rows[0]) throw new NotFoundException('PLATFORM_SUBSCRIPTION_PAYMENT_NOT_FOUND');
    if (!rows[0].storageKey || !rows[0].contentType) throw new NotFoundException('PLATFORM_SUBSCRIPTION_PAYMENT_PROOF_NOT_FOUND');
    return this.proofStorage.read(rows[0].storageKey, rows[0].contentType);
  }

  private validatePlan(input: SubscriptionPlanInput, partial: boolean) {
    const result: Record<string, unknown> = {};
    if (!partial || Object.prototype.hasOwnProperty.call(input, 'code')) {
      const code = this.requiredText(input.code, 80, 'PLATFORM_SUBSCRIPTION_PLAN_CODE_INVALID').toLowerCase();
      if (!/^[a-z0-9][a-z0-9._-]*$/.test(code)) throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_CODE_INVALID');
      result.code = code;
    }
    if (!partial || Object.prototype.hasOwnProperty.call(input, 'name')) {
      result.name = this.requiredText(input.name, 120, 'PLATFORM_SUBSCRIPTION_PLAN_NAME_INVALID');
    }
    if (!partial || Object.prototype.hasOwnProperty.call(input, 'description')) {
      result.description = this.optionalText(input.description, 2000);
    }
    if (!partial || Object.prototype.hasOwnProperty.call(input, 'price')) {
      const price = this.decimal(input.price, false, 'PLATFORM_SUBSCRIPTION_PLAN_PRICE_INVALID');
      result.price = price;
    }
    if (!partial || Object.prototype.hasOwnProperty.call(input, 'currency')) {
      const currency = this.requiredText(input.currency, 3, 'PLATFORM_SUBSCRIPTION_PLAN_CURRENCY_INVALID').toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_CURRENCY_INVALID');
      result.currency = currency;
    }
    if (!partial || Object.prototype.hasOwnProperty.call(input, 'planType')) {
      if (!PLAN_TYPES.includes(input.planType as (typeof PLAN_TYPES)[number])) throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_TYPE_INVALID');
      result.planType = input.planType;
    }
    if (!partial || Object.prototype.hasOwnProperty.call(input, 'intervalUnit')) {
      if (!PLAN_INTERVAL_UNITS.includes(input.intervalUnit as (typeof PLAN_INTERVAL_UNITS)[number])) throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_INTERVAL_UNIT_INVALID');
      result.intervalUnit = input.intervalUnit;
    }
    if (!partial || Object.prototype.hasOwnProperty.call(input, 'intervalCount')) {
      if (!Number.isSafeInteger(input.intervalCount) || Number(input.intervalCount) <= 0) throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_INTERVAL_COUNT_INVALID');
      result.intervalCount = input.intervalCount;
    }
    if (!partial) result.billingInterval = input.intervalUnit === 'year' ? 'yearly' : 'monthly';
    if (!partial || Object.prototype.hasOwnProperty.call(input, 'gracePeriodDays')) {
      if (!Number.isSafeInteger(input.gracePeriodDays) || Number(input.gracePeriodDays) < 0) {
        throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_GRACE_INVALID');
      }
      result.gracePeriodDays = input.gracePeriodDays;
    }
    if (!partial || Object.prototype.hasOwnProperty.call(input, 'limitsBenefits')) {
      const value = input.limitsBenefits ?? {};
      if (!this.isPlainObject(value)) throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_BENEFITS_INVALID');
      result.limitsBenefits = value;
    }
    if (!partial || Object.prototype.hasOwnProperty.call(input, 'isActive')) {
      const isActive = input.isActive ?? true;
      if (typeof isActive !== 'boolean') throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_ACTIVE_INVALID');
      result.isActive = isActive;
    }
    return result as {
      code?: string;
      name?: string;
      description?: string | null;
      price?: string;
      currency?: string;
      billingInterval?: 'monthly' | 'yearly';
      planType?: 'trial' | 'paid';
      intervalUnit?: 'day' | 'month' | 'year';
      intervalCount?: number;
      gracePeriodDays?: number;
      limitsBenefits?: Record<string, unknown>;
      isActive?: boolean;
    };
  }

  private validatePayment(input: ManualSubscriptionPaymentInput) {
    const paidAt = this.parseTimestamp(input?.paidAt, true, 'PLATFORM_SUBSCRIPTION_PAYMENT_DATE_INVALID')!;
    const periodStart = this.parseTimestamp(input?.periodStart, true, 'PLATFORM_SUBSCRIPTION_PAYMENT_PERIOD_INVALID')!;
    const periodEnd = this.parseTimestamp(input?.periodEnd, true, 'PLATFORM_SUBSCRIPTION_PAYMENT_PERIOD_INVALID')!;
    if (periodEnd <= periodStart) throw new BadRequestException('PLATFORM_SUBSCRIPTION_PAYMENT_PERIOD_INVALID');
    const amount = this.decimal(input?.amount, true, 'PLATFORM_SUBSCRIPTION_PAYMENT_AMOUNT_INVALID');
    const currency = this.requiredText(input?.currency, 3, 'PLATFORM_SUBSCRIPTION_PAYMENT_CURRENCY_INVALID').toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new BadRequestException('PLATFORM_SUBSCRIPTION_PAYMENT_CURRENCY_INVALID');
    return {
      paidAt,
      amount,
      currency,
      method: this.requiredText(input?.method, 80, 'PLATFORM_SUBSCRIPTION_PAYMENT_METHOD_INVALID'),
      reference: this.optionalText(input?.reference, 160),
      idempotencyKey: this.requiredText(input?.idempotencyKey, 128, 'PLATFORM_SUBSCRIPTION_PAYMENT_IDEMPOTENCY_KEY_REQUIRED'),
      periodStart,
      periodEnd,
    };
  }

  private async findIdempotentPayment(laboratoryId: number, payment: ReturnType<PlatformSubscriptionBillingService['validatePayment']>) {
    const rows = await this.dataSource.query(
      `SELECT id AS "paymentId",subscription_id AS "subscriptionId",laboratory_id AS "laboratoryId",
        paid_at AS "paidAt",amount,currency,method,reference,period_start AS "periodStart",
        period_end AS "periodEnd",(proof_storage_key IS NOT NULL) AS "hasProof",
        recorded_by AS "recordedBy",created_at AS "createdAt"
       FROM platform_subscription_payments WHERE laboratory_id=$1 AND idempotency_key=$2`,
      [laboratoryId, payment.idempotencyKey],
    );
    if (!rows[0]) return null;
    this.assertSameIdempotentPayment(rows[0], payment);
    return rows[0];
  }

  private assertSameIdempotentPayment(
    existing: Record<string, unknown>,
    payment: ReturnType<PlatformSubscriptionBillingService['validatePayment']>,
  ) {
    const same = new Date(existing.paidAt as string | Date).getTime() === payment.paidAt.getTime()
      && String(existing.amount) === payment.amount
      && String(existing.currency).trim() === payment.currency
      && existing.method === payment.method
      && (existing.reference ?? null) === payment.reference
      && new Date(existing.periodStart as string | Date).getTime() === payment.periodStart.getTime()
      && new Date(existing.periodEnd as string | Date).getTime() === payment.periodEnd.getTime();
    if (!same) throw new ConflictException('PLATFORM_SUBSCRIPTION_PAYMENT_IDEMPOTENCY_KEY_REUSED');
  }

  private async writeBillingAudit(
    manager: EntityManager,
    input: {
      ownerId: number;
      laboratoryId?: number;
      subjectType: string;
      subjectId?: number;
      action: string;
      summary: string;
      metadata: Record<string, unknown>;
    },
  ) {
    await manager.query(
      `INSERT INTO platform_billing_audit_logs
        (laboratory_id,platform_owner_id,subject_type,subject_id,action,summary,metadata_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [
        input.laboratoryId ?? null,
        input.ownerId,
        input.subjectType,
        input.subjectId ?? null,
        input.action,
        input.summary,
        JSON.stringify(input.metadata),
      ],
    );
  }

  private planAuditSnapshot(plan: Record<string, unknown>) {
    return {
      code: plan.code,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      billingInterval: plan.billingInterval,
      planType: plan.planType,
      intervalUnit: plan.intervalUnit,
      intervalCount: plan.intervalCount,
      gracePeriodDays: plan.gracePeriodDays,
      isActive: plan.isActive,
    };
  }

  private subscriptionAuditSnapshot(subscription: Record<string, unknown>) {
    return {
      planCode: subscription.plan_code ?? subscription.planCode,
      planType: subscription.plan_type ?? subscription.planType,
      intervalUnit: subscription.interval_unit ?? subscription.intervalUnit,
      intervalCount: subscription.interval_count ?? subscription.intervalCount,
      status: subscription.status,
      startsAt: subscription.starts_at ?? subscription.startsAt,
      expiresAt: subscription.expires_at ?? subscription.expiresAt,
      graceUntil: subscription.grace_until ?? subscription.graceUntil,
      gracePeriodDays: subscription.grace_period_days ?? subscription.gracePeriodDays,
      isCurrent: subscription.is_current ?? subscription.isCurrent,
    };
  }

  private addPlanDuration(startsAt: Date, unit: unknown, count: number): Date {
    if (!PLAN_INTERVAL_UNITS.includes(unit as (typeof PLAN_INTERVAL_UNITS)[number]) || !Number.isSafeInteger(count) || count <= 0) {
      throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_DURATION_INVALID');
    }
    const result = new Date(startsAt.getTime());
    if (unit === 'day') result.setUTCDate(result.getUTCDate() + count);
    else if (unit === 'month') result.setUTCMonth(result.getUTCMonth() + count);
    else result.setUTCFullYear(result.getUTCFullYear() + count);
    if (Number.isNaN(result.getTime())) throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_DURATION_INVALID');
    return result;
  }
  private parseTimestamp(value: unknown, required: boolean, code: string): Date | null {
    if (value == null || value === '') {
      if (required) throw new BadRequestException(code);
      return null;
    }
    if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) throw new BadRequestException(code);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException(code);
    return parsed;
  }

  private requiredText(value: unknown, max: number, code: string) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new BadRequestException(code);
    return value.trim();
  }

  private optionalText(value: unknown, max: number) {
    if (value == null || value === '') return null;
    if (typeof value !== 'string' || value.trim().length > max) throw new BadRequestException('PLATFORM_SUBSCRIPTION_FIELD_INVALID');
    return value.trim() || null;
  }

  private decimal(value: unknown, allowZero: boolean, code: string) {
    const text = typeof value === 'number' && Number.isFinite(value) ? String(value) : value;
    if (typeof text !== 'string' || !/^\d{1,12}(?:\.\d{1,2})?$/.test(text)) throw new BadRequestException(code);
    const normalized = text.includes('.') ? text : `${text}.00`;
    if (!allowZero && Number(normalized) < 0) throw new BadRequestException(code);
    if (allowZero && Number(normalized) <= 0) throw new BadRequestException(code);
    return normalized;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  private validateId(value: number, code: string) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new BadRequestException(code);
  }

  private validateOwnerId(ownerId: number) {
    if (!Number.isSafeInteger(ownerId) || ownerId <= 0) throw new BadRequestException('PLATFORM_OWNER_CONTEXT_REQUIRED');
  }

  private isUniqueViolation(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }

}
