import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type TenantSubscriptionStatus =
  | 'trial'
  | 'active'
  | 'grace'
  | 'suspended'
  | 'cancelled'
  | 'perpetual_free'
  | null;

export interface TenantSubscriptionAccessState {
  isActive: boolean;
  status: TenantSubscriptionStatus;
  startsAt: Date | string | null;
  expiresAt: Date | string | null;
  graceUntil: Date | string | null;
  perpetualFreeReason?: string | null;
  perpetualFreeGrantedAt?: Date | string | null;
  perpetualFreeGrantedBy?: number | null;
}

@Injectable()
export class SubscriptionAccessService {
  constructor(private readonly dataSource: DataSource) {}

  async assertTenantCanAccess(laboratoryId: number, now = new Date()): Promise<void> {
    const rows = await this.dataSource.query(
      `SELECT l.is_active AS "isActive",
        COALESCE(s.status,l.subscription_status) AS status,
        COALESCE(s.starts_at,l.service_starts_at) AS "startsAt",
        COALESCE(s.expires_at,l.service_expires_at) AS "expiresAt",
        COALESCE(s.grace_until,l.grace_until) AS "graceUntil",
        COALESCE(s.perpetual_free_reason,l.perpetual_free_reason) AS "perpetualFreeReason",
        COALESCE(s.perpetual_free_granted_at,l.perpetual_free_granted_at) AS "perpetualFreeGrantedAt",
        COALESCE(s.perpetual_free_granted_by,l.perpetual_free_granted_by) AS "perpetualFreeGrantedBy"
       FROM laboratory l
       LEFT JOIN platform_subscriptions s ON s.laboratory_id=l.id AND s.is_current=true
       WHERE l.id=$1`,
      [laboratoryId],
    );
    if (!rows[0] || !this.canAccess(rows[0], now)) {
      throw new ForbiddenException('PLATFORM_SUBSCRIPTION_ACCESS_DENIED');
    }
  }

  canAccess(state: TenantSubscriptionAccessState, now = new Date()): boolean {
    if (state.isActive !== true) return false;
    if (state.status == null) return true;
    if (state.status === 'perpetual_free') {
      return Boolean(
        state.perpetualFreeReason?.trim() &&
        state.perpetualFreeGrantedAt &&
        state.perpetualFreeGrantedBy &&
        !state.expiresAt &&
        !state.graceUntil,
      );
    }
    if (state.status === 'suspended' || state.status === 'cancelled') return false;
    const startsAt = this.toDate(state.startsAt);
    if (!startsAt || startsAt > now) return false;
    const expiresAt = this.toDate(state.expiresAt);
    if (!expiresAt) return false;
    if (state.status === 'grace') {
      const graceUntil = this.toDate(state.graceUntil);
      return Boolean(graceUntil && now <= graceUntil);
    }
    if (now <= expiresAt) return true;
    const graceUntil = this.toDate(state.graceUntil);
    return Boolean(graceUntil && now <= graceUntil);
  }

  private toDate(value: Date | string | null) {
    if (value == null) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
