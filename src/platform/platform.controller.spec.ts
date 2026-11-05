import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlatformController } from './platform.controller';

describe('PlatformController laboratory listing', () => {
  it('returns catalog package counts separately from enabled application modules', async () => {
    const rows = [{
      id: 3,
      branchCount: 1,
      moduleCount: 0,
      catalogPackageCount: 11,
    }];
    const query = jest.fn().mockResolvedValue(rows);
    const controller = new PlatformController({ query } as never, {} as never, {} as never, {} as never);

    await expect(controller.laboratories()).resolves.toBe(rows);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('FROM laboratory_modules m WHERE m.laboratory_id=l.id AND m.is_enabled=true) AS "moduleCount"');
    expect(sql).toContain('FROM laboratory_catalog_packages cp WHERE cp.laboratory_id=l.id) AS "catalogPackageCount"');
  });

  it('uses stable plan, subscription and payment wrappers for owner APIs', async () => {
    const subscriptionBilling = {
      listPlans: jest.fn().mockResolvedValue([{ planId: 7, isActive: true, limitsBenefits: { users: 5 } }]),
      createPlan: jest.fn().mockResolvedValue({ planId: 7 }),
      getSubscription: jest.fn().mockResolvedValue({ subscriptionId: '12', planId: 7, planCode: 'basic' }),
      assignPlan: jest.fn().mockResolvedValue({ subscription: { subscriptionId: '13' } }),
      listPayments: jest.fn().mockResolvedValue([{ paymentId: '19', hasProof: true }]),
      recordPayment: jest.fn().mockResolvedValue({ payment: { paymentId: '20' } }),
    };
    const controller = new PlatformController(
      { query: jest.fn() } as never,
      {} as never,
      {} as never,
      subscriptionBilling as never,
    );
    const owner = { user: { identityType: 'platform-owner', userId: 70 } };

    await expect(controller.listSubscriptionPlans('false')).resolves.toEqual({
      plans: [{ planId: 7, isActive: true, limitsBenefits: { users: 5 } }],
    });
    await expect(controller.createSubscriptionPlan({ code: 'basic' }, owner)).resolves.toEqual({
      plan: { planId: 7 },
    });
    await expect(controller.getSubscription('8')).resolves.toEqual({
      subscription: { subscriptionId: '12', planId: 7, planCode: 'basic' },
    });
    await expect(controller.assignSubscriptionPlan('8', {
      status: 'perpetual_free',
      perpetualFreeReason: 'Owner grant',
    }, owner)).resolves.toEqual({ subscription: { subscriptionId: '13' } });
    await expect(controller.listSubscriptionPayments('8')).resolves.toEqual({
      payments: [{ paymentId: '19', hasProof: true }],
    });
    await expect(controller.recordSubscriptionPayment('8', { payment: '{"amount":"12.50"}' }, undefined, owner))
      .resolves.toEqual({ payment: { paymentId: '20' } });
    expect(subscriptionBilling.assignPlan).toHaveBeenCalledWith(8, {
      status: 'perpetual_free',
      perpetualFreeReason: 'Owner grant',
    }, 70);
  });

  it('rejects invalid plan filters and non-owner writes before invoking billing services', async () => {
    const subscriptionBilling = {
      listPlans: jest.fn(),
      createPlan: jest.fn(),
    };
    const controller = new PlatformController(
      { query: jest.fn() } as never,
      {} as never,
      {} as never,
      subscriptionBilling as never,
    );
    await expect(controller.listSubscriptionPlans('active')).rejects.toThrow(
      new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_FILTER_INVALID'),
    );
    await expect(controller.createSubscriptionPlan({ code: 'basic' }, {
      user: { identityType: 'tenant', userId: 8 },
    })).rejects.toThrow(new ForbiddenException('PLATFORM_OWNER_REQUIRED'));
    expect(subscriptionBilling.listPlans).not.toHaveBeenCalled();
    expect(subscriptionBilling.createPlan).not.toHaveBeenCalled();
  });

  it('exposes detail, package, branch, and owner-reauthenticated delete APIs through the admin service', async () => {
    const admin = {
      getLaboratory: jest.fn().mockResolvedValue({ access: { slug: 'lab-a' } }),
      listPackages: jest.fn().mockResolvedValue({ installed: [], available: [] }),
      listBranches: jest.fn().mockResolvedValue([]),
      deleteLaboratory: jest.fn().mockResolvedValue({ deleted: true }),
    };
    const controller = new PlatformController({ query: jest.fn() } as never, {} as never, admin as never, {} as never);

    await expect(controller.getLaboratory('4')).resolves.toEqual({ access: { slug: 'lab-a' } });
    await expect(controller.listPackages('4')).resolves.toEqual({ installed: [], available: [] });
    await expect(controller.listBranches('4')).resolves.toEqual([]);
    await expect(controller.deleteLaboratory('4', { password: 'secret' }, {
      user: { identityType: 'platform-owner', userId: 70 },
    })).resolves.toEqual({ deleted: true });
    expect(admin.deleteLaboratory).toHaveBeenCalledWith(4, 70, 'secret');
  });
});
