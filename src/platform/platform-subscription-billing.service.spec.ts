import { BadRequestException } from '@nestjs/common';
import { PlatformSubscriptionBillingService } from './platform-subscription-billing.service';

type QueryMock = jest.Mock<Promise<unknown>, [sql: string, parameters?: unknown[]]>;

function makeService(
  query: QueryMock,
  transaction?: jest.Mock,
  proofStorage = { store: jest.fn(), remove: jest.fn(), read: jest.fn() },
) {
  const manager = { query };
  const dataSource = {
    query,
    transaction: transaction ?? jest.fn(async (...args: unknown[]) => {
      const work = args[args.length - 1] as (manager: unknown) => Promise<unknown>;
      return work(manager);
    }),
  };
  return {
    service: new PlatformSubscriptionBillingService(dataSource as never, proofStorage as never),
    dataSource,
    manager,
    proofStorage,
  };
}

describe('PlatformSubscriptionBillingService', () => {
  it('creates plans with normalized codes, object benefits and owner audit in one transaction', async () => {
    const plan = {
      planId: 7,
      code: 'basic',
      name: 'Basic',
      price: '12.50',
      currency: 'USD',
      planType: 'paid', intervalUnit: 'month', intervalCount: 1,
      gracePeriodDays: 5,
      limitsBenefits: { users: 5 },
      isActive: true,
    };
    const query: QueryMock = jest.fn(async (sql: string) => {
      if (sql.startsWith('INSERT INTO platform_subscription_plans')) return [plan];
      if (sql.startsWith('INSERT INTO platform_billing_audit_logs')) return [];
      throw new Error(`UNEXPECTED_SQL: ${sql}`);
    });
    const { service, dataSource } = makeService(query);

    await expect(service.createPlan({
      code: ' BASIC ',
      name: 'Basic',
      price: '12.50',
      currency: 'usd',
      planType: 'paid', intervalUnit: 'month', intervalCount: 1,
      gracePeriodDays: 5,
      limitsBenefits: { users: 5 },
    }, 70)).resolves.toBe(plan);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual([
      'basic', 'Basic', null, '12.50', 'USD', 'monthly', 'paid', 'month', 1, 5, '{"users":5}', true,
    ]);
    expect(query.mock.calls[1][1]).toEqual(expect.arrayContaining([70, 'platform.subscription-plan.created']));
  });

  it('rejects invalid plan intervals, currencies, grace periods and non-object limits before DB access', async () => {
    const query: QueryMock = jest.fn<Promise<unknown>, [sql: string, parameters?: unknown[]]>(async () => []);
    const { service } = makeService(query);
    const common = {
      code: 'basic',
      name: 'Basic',
      price: '1.00',
      currency: 'USD',
      planType: 'paid', intervalUnit: 'month', intervalCount: 1,
      gracePeriodDays: 0,
      limitsBenefits: {},
    };
    await expect(service.createPlan({ ...common, intervalUnit: 'week' }, 70))
      .rejects.toThrow(new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_INTERVAL_UNIT_INVALID'));
    await expect(service.createPlan({ ...common, currency: 'US' }, 70))
      .rejects.toThrow(new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_CURRENCY_INVALID'));
    await expect(service.createPlan({ ...common, gracePeriodDays: -1 }, 70))
      .rejects.toThrow(new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_GRACE_INVALID'));
    await expect(service.createPlan({ ...common, limitsBenefits: [] }, 70))
      .rejects.toThrow(new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_BENEFITS_INVALID'));
    expect(query).not.toHaveBeenCalled();
  });

  it('assigns a new subscription snapshot and computes grace from the copied plan value', async () => {
    const query: QueryMock = jest.fn(async (sql: string) => {
      if (sql.startsWith('SELECT id FROM laboratory')) return [{ id: 8 }];
      if (sql.includes('FROM platform_subscription_plans')) {
        return [{
          id: 7, code: 'basic', name: 'Basic', description: 'Plan description', price: '12.50',
          currency: 'USD', billing_interval: 'monthly', plan_type: 'paid', interval_unit: 'month', interval_count: 1, grace_period_days: 5, limits_benefits: { users: 5 },
        }];
      }
      if (sql.startsWith('SELECT id,plan_code AS "planCode"')) return [];
      if (sql.startsWith('INSERT INTO platform_subscriptions')) return [{ id: '12' }];
      if (sql.startsWith('SELECT id AS "subscriptionId"')) {
        return [{ subscriptionId: '12', planId: 7, planCode: 'basic', planName: 'Basic', planDescription: 'Plan description', status: 'active' }];
      }
      if (sql.startsWith('UPDATE') || sql.startsWith('INSERT INTO platform_billing_audit_logs')) return [];
      throw new Error(`UNEXPECTED_SQL: ${sql}`);
    });
    const { service, dataSource } = makeService(query);

    await expect(service.assignPlan(8, {
      planCode: 'BASIC',
      startsAt: '2026-10-30T00:00:00Z',
    }, 70)).resolves.toEqual({
      subscription: expect.objectContaining({ subscriptionId: '12', planId: 7, planCode: 'basic' }),
    });
    expect(dataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
    const insert = query.mock.calls.find(([sql]) => String(sql).startsWith('INSERT INTO platform_subscriptions'));
    expect(insert?.[1]).toEqual(expect.arrayContaining([
      8, 7, 'basic', 'Basic', 'Plan description', '12.50', 'USD', 'monthly', '{"users":5}', 5,
    ]));
    const serializedDates = insert?.[1]
      ?.map((value) => {
        if (value instanceof Date) return value.toISOString();
        if (typeof value !== 'string') return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
      })
      .filter((value): value is string => value !== null) ?? [];
    expect(serializedDates).toContain('2026-11-30T00:00:00.000Z');
    expect(serializedDates).toContain('2026-12-05T00:00:00.000Z');
    expect(query.mock.calls.some(([sql]) => String(sql).includes('SET is_current=false,ended_at=now()'))).toBe(true);
  });

  it('rejects manual trial or active status because normal status is derived from the plan', async () => {
    const { service, dataSource } = makeService(jest.fn());
    await expect(service.assignPlan(8, {
      planCode: 'trial-15', status: 'trial', startsAt: '2026-11-06T00:00:00Z',
    }, 70)).rejects.toThrow('PLATFORM_SUBSCRIPTION_STATUS_DERIVED_FROM_PLAN');
    await expect(service.assignPlan(8, {
      planCode: 'basic', status: 'active', startsAt: '2026-11-06T00:00:00Z',
    }, 70)).rejects.toThrow('PLATFORM_SUBSCRIPTION_STATUS_DERIVED_FROM_PLAN');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('derives trial status and 15-day expiry from the selected plan', async () => {
    const query: QueryMock = jest.fn(async (sql: string) => {
      if (sql.startsWith('SELECT id FROM laboratory')) return [{ id: 8 }];
      if (sql.includes('FROM platform_subscription_plans')) return [{ id: 9, code: 'trial-15', name: 'Trial 15 días', description: null, price: '0.00', currency: 'USD', billing_interval: 'monthly', plan_type: 'trial', interval_unit: 'day', interval_count: 15, grace_period_days: 0, limits_benefits: {} }];
      if (sql.startsWith('SELECT id,plan_code AS "planCode"')) return [];
      if (sql.startsWith('INSERT INTO platform_subscriptions')) return [{ id: '21' }];
      if (sql.startsWith('SELECT id AS "subscriptionId"')) return [{ subscriptionId: '21', status: 'trial', expiresAt: new Date('2026-11-21T00:00:00Z') }];
      if (sql.startsWith('UPDATE') || sql.startsWith('INSERT INTO platform_billing_audit_logs')) return [];
      throw new Error(`UNEXPECTED_SQL: ${sql}`);
    });
    const { service } = makeService(query);
    await service.assignPlan(8, { planCode: 'trial-15', startsAt: '2026-11-06T00:00:00Z' }, 70);
    const insert = query.mock.calls.find(([sql]) => String(sql).startsWith('INSERT INTO platform_subscriptions'));
    expect(insert?.[1]).toEqual(expect.arrayContaining(['trial', 'day', 15]));
    expect(insert?.[1]?.some((value) => value instanceof Date && value.toISOString() === '2026-11-21T00:00:00.000Z')).toBe(true);
  });

  it('assigns perpetual-free without a catalog plan and requires a reason', async () => {
    const query: QueryMock = jest.fn(async (sql: string) => {
      if (sql.startsWith('SELECT id FROM laboratory')) return [{ id: 8 }];
      if (sql.startsWith('SELECT id,plan_code AS "planCode"')) return [];
      if (sql.startsWith('INSERT INTO platform_subscriptions')) return [{ id: '12' }];
      if (sql.startsWith('SELECT id AS "subscriptionId"')) return [{ subscriptionId: '12', status: 'perpetual_free', planCode: 'perpetual-free' }];
      if (sql.startsWith('UPDATE') || sql.startsWith('INSERT INTO platform_billing_audit_logs')) return [];
      throw new Error(`UNEXPECTED_SQL: ${sql}`);
    });
    const { service } = makeService(query);
    await expect(service.assignPlan(8, {
      status: 'perpetual_free',
      startsAt: '2026-10-30T00:00:00Z',
    }, 70)).rejects.toThrow('PLATFORM_PERPETUAL_FREE_REASON_REQUIRED');
    await expect(service.assignPlan(8, {
      status: 'perpetual_free',
      startsAt: '2026-10-30T00:00:00Z',
      perpetualFreeReason: 'Owner-approved grant',
    }, 70)).resolves.toEqual({
      subscription: expect.objectContaining({ subscriptionId: '12', status: 'perpetual_free' }),
    });
    const insert = query.mock.calls.find(([sql]) => String(sql).startsWith('INSERT INTO platform_subscriptions'));
    expect(insert?.[1]).toEqual(expect.arrayContaining(['perpetual-free', 'Perpetual free', '0.00', 'VES', 0]));
    const startsAtIndex = insert?.[1]?.findIndex((value) => value instanceof Date && value.toISOString() === '2026-10-30T00:00:00.000Z') ?? -1;
    expect(startsAtIndex).toBeGreaterThanOrEqual(0);
    expect(insert?.[1]?.[startsAtIndex + 1]).toBeNull();
    expect(insert?.[1]?.[startsAtIndex + 2]).toBeNull();
  });

  it('audits valid status transitions with owner actor and rejects forbidden transitions', async () => {
    const suspendedSubscription = {
      id: '12',
      status: 'suspended',
      starts_at: new Date('2026-01-01T00:00:00Z'),
      expires_at: new Date('2027-10-30T00:00:00Z'),
      grace_until: null,
      grace_period_days: 0,
      is_current: true,
    };
    const query: QueryMock = jest.fn(async (sql: string) => {
      if (sql.startsWith('SELECT * FROM platform_subscriptions')) return [suspendedSubscription];
      if (sql.startsWith('SELECT id AS "subscriptionId"')) {
        return [{ subscriptionId: '12', status: 'active', isCurrent: true }];
      }
      if (sql.startsWith('UPDATE') || sql.startsWith('INSERT INTO platform_billing_audit_logs')) return [];
      throw new Error(`UNEXPECTED_SQL: ${sql}`);
    });
    const { service, dataSource } = makeService(query);

    await expect(service.changeStatus(8, { status: 'active' }, 70)).resolves.toEqual({
      subscription: { subscriptionId: '12', status: 'active', isCurrent: true },
    });
    expect(dataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
    const auditCall = query.mock.calls.find(([sql]) => String(sql).startsWith('INSERT INTO platform_billing_audit_logs'));
    expect(auditCall?.[1]).toEqual(expect.arrayContaining([8, 70, 'subscription', 12, 'platform.subscription.status.changed']));
    expect(JSON.parse(String(auditCall?.[1]?.[6]))).toEqual(expect.objectContaining({
      before: expect.objectContaining({ status: 'suspended' }),
      after: { status: 'active', reason: null },
    }));

    const forbiddenQuery: QueryMock = jest.fn(async (sql: string) => {
      if (sql.startsWith('SELECT * FROM platform_subscriptions')) {
        return [{ ...suspendedSubscription, status: 'cancelled' }];
      }
      if (sql.startsWith('UPDATE') || sql.startsWith('INSERT INTO platform_billing_audit_logs')) return [];
      throw new Error(`UNEXPECTED_SQL: ${sql}`);
    });
    const forbidden = makeService(forbiddenQuery);
    await expect(forbidden.service.changeStatus(8, { status: 'active' }, 70))
      .rejects.toThrow('PLATFORM_SUBSCRIPTION_TRANSITION_INVALID');
    expect(forbiddenQuery.mock.calls.some(([sql]) => String(sql).startsWith('UPDATE'))).toBe(false);
    expect(forbiddenQuery.mock.calls.some(([sql]) => String(sql).startsWith('INSERT INTO platform_billing_audit_logs'))).toBe(false);
  });

  it('records a payment, renews and audits before/after atomically, and stores the proof privately', async () => {
    const calls: string[] = [];
    const currentSubscription = {
      id: '12',
      status: 'grace',
      starts_at: new Date('2026-01-01T00:00:00Z'),
      expires_at: new Date('2026-10-01T00:00:00Z'),
      grace_until: new Date('2026-10-06T00:00:00Z'),
      grace_period_days: 5,
      is_current: true,
    };
    const payment = { paymentId: '19', subscriptionId: '12', hasProof: true };
    const query: QueryMock = jest.fn(async (sql: string) => {
      calls.push(sql);
      if (sql.includes('FROM platform_subscription_payments WHERE laboratory_id=$1 AND idempotency_key=$2')) return [];
      if (sql.startsWith('SELECT * FROM platform_subscriptions')) return [currentSubscription];
      if (sql.startsWith('INSERT INTO platform_subscription_payments')) return [payment];
      if (sql.startsWith('INSERT INTO platform_billing_audit_logs')) return [];
      if (sql.startsWith('UPDATE')) return [];
      throw new Error(`UNEXPECTED_SQL: ${sql}`);
    });
    const proofStorage = {
      store: jest.fn().mockResolvedValue({ storageKey: 'server-generated.pdf', contentType: 'application/pdf' }),
      remove: jest.fn(),
      read: jest.fn(),
    };
    const { service, dataSource } = makeService(query, undefined, proofStorage);
    const result = await service.recordPayment(8, {
      idempotencyKey: 'billing-2026-10-001',
      paidAt: '2026-10-30T12:00:00Z',
      amount: '12.50',
      currency: 'USD',
      method: 'Bank transfer',
      reference: 'R-100',
      periodStart: '2026-10-30T00:00:00Z',
      periodEnd: '2027-10-30T00:00:00Z',
    }, 70, { buffer: Buffer.from('%PDF-1.7'), originalname: 'receipt.pdf', mimetype: 'application/pdf' });

    expect(result).toEqual({ payment });
    expect(dataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
    expect(calls.some((sql) => sql.startsWith('UPDATE platform_subscriptions SET status'))).toBe(true);
    expect(calls.some((sql) => sql.startsWith('UPDATE laboratory SET subscription_status'))).toBe(true);
    const auditCall = query.mock.calls.find(([sql]) => String(sql).startsWith('INSERT INTO platform_billing_audit_logs'));
    expect(auditCall?.[1]).toEqual(expect.arrayContaining([8, 70, 'payment', 19, 'platform.subscription.payment.recorded']));
    const auditMetadata = JSON.parse(String(auditCall?.[1]?.[6]));
    expect(auditMetadata.before.status).toBe('grace');
    expect(auditMetadata.after.status).toBe('active');
    expect(auditMetadata.after.expiresAt).toBe('2027-10-30T00:00:00.000Z');
    expect(auditMetadata.hasProof).toBe(true);
    expect(proofStorage.store).toHaveBeenCalledTimes(1);
  });

  it('returns an existing payment for the same idempotency key without reactivating or extending again', async () => {
    const priorPayment = {
      paymentId: '19',
      paidAt: new Date('2026-10-30T12:00:00Z'),
      amount: '12.50',
      currency: 'USD',
      method: 'Bank transfer',
      reference: 'R-100',
      periodStart: new Date('2026-10-30T00:00:00Z'),
      periodEnd: new Date('2027-10-30T00:00:00Z'),
      hasProof: true,
    };
    const query: QueryMock = jest.fn().mockResolvedValue([priorPayment]);
    const { service, dataSource, proofStorage } = makeService(query);
    await expect(service.recordPayment(8, {
      idempotencyKey: 'billing-2026-10-001',
      paidAt: '2026-10-30T12:00:00Z',
      amount: '12.50',
      currency: 'USD',
      method: 'Bank transfer',
      reference: 'R-100',
      periodStart: '2026-10-30T00:00:00Z',
      periodEnd: '2027-10-30T00:00:00Z',
    }, 70)).resolves.toEqual({ payment: priorPayment });
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(proofStorage.store).not.toHaveBeenCalled();
  });

  it('scopes proof downloads to both tenant and payment identifiers', async () => {
    const query: QueryMock = jest.fn().mockResolvedValue([{ storageKey: 'server-generated.pdf', contentType: 'application/pdf' }]);
    const proofStorage = { store: jest.fn(), remove: jest.fn(), read: jest.fn().mockResolvedValue({ buffer: Buffer.from('proof'), contentType: 'application/pdf' }) };
    const { service } = makeService(query, undefined, proofStorage);
    await expect(service.downloadPaymentProof(8, 19)).resolves.toEqual({
      buffer: Buffer.from('proof'),
      contentType: 'application/pdf',
    });
    expect(query.mock.calls[0][1]).toEqual([8, 19]);
    expect(query.mock.calls[0][0]).toContain('WHERE laboratory_id=$1 AND id=$2');
  });
});
