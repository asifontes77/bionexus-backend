import { SubscriptionAccessService } from './subscription-access.service';

describe('SubscriptionAccessService', () => {
  const service = new SubscriptionAccessService({} as never);
  const now = new Date('2027-01-15T00:00:00Z');

  it('allows active subscriptions only within their service window and configured grace period', () => {
    expect(service.canAccess({
      isActive: true,
      status: 'active',
      startsAt: '2027-01-01T00:00:00Z',
      expiresAt: '2027-02-01T00:00:00Z',
      graceUntil: null,
    }, now)).toBe(true);

    expect(service.canAccess({
      isActive: true,
      status: 'active',
      startsAt: '2026-01-01T00:00:00Z',
      expiresAt: '2027-01-01T00:00:00Z',
      graceUntil: '2027-01-20T00:00:00Z',
    }, now)).toBe(true);
    expect(service.canAccess({
      isActive: true,
      status: 'active',
      startsAt: '2026-01-01T00:00:00Z',
      expiresAt: '2027-01-01T00:00:00Z',
      graceUntil: null,
    }, now)).toBe(false);
  });

  it('denies inactive, future, suspended and cancelled subscriptions', () => {
    const state = {
      isActive: true,
      status: 'active' as const,
      startsAt: '2027-02-01T00:00:00Z',
      expiresAt: '2027-03-01T00:00:00Z',
      graceUntil: null,
    };
    expect(service.canAccess({ ...state, isActive: false }, now)).toBe(false);
    expect(service.canAccess(state, now)).toBe(false);
    expect(service.canAccess({ ...state, status: 'suspended', startsAt: '2026-01-01T00:00:00Z' }, now)).toBe(false);
    expect(service.canAccess({ ...state, status: 'cancelled', startsAt: '2026-01-01T00:00:00Z' }, now)).toBe(false);
  });

  it('allows grace only through graceUntil and perpetual-free only with required grant metadata', () => {
    expect(service.canAccess({
      isActive: true,
      status: 'grace',
      startsAt: '2026-01-01T00:00:00Z',
      expiresAt: '2027-01-01T00:00:00Z',
      graceUntil: '2027-01-20T00:00:00Z',
    }, now)).toBe(true);
    expect(service.canAccess({
      isActive: true,
      status: 'grace',
      startsAt: '2026-01-01T00:00:00Z',
      expiresAt: '2027-01-01T00:00:00Z',
      graceUntil: '2027-01-10T00:00:00Z',
    }, now)).toBe(false);
    expect(service.canAccess({
      isActive: true,
      status: 'perpetual_free',
      startsAt: '2026-01-01T00:00:00Z',
      expiresAt: null,
      graceUntil: null,
      perpetualFreeReason: 'Owner grant',
      perpetualFreeGrantedAt: '2026-01-01T00:00:00Z',
      perpetualFreeGrantedBy: 70,
    }, now)).toBe(true);
    expect(service.canAccess({
      isActive: true,
      status: 'perpetual_free',
      startsAt: '2026-01-01T00:00:00Z',
      expiresAt: null,
      graceUntil: null,
    }, now)).toBe(false);
  });
});
