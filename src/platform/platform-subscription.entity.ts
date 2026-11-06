import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'platform_subscriptions' })
@Index('UQ_platform_subscriptions_current_laboratory', ['laboratory_id'], { unique: true, where: '"is_current" = true' })
export class PlatformSubscription {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column('int')
  laboratory_id: number;

  @Column('int', { nullable: true })
  plan_id: number | null;

  @Column('varchar', { length: 80 })
  plan_code: string;

  @Column('varchar', { length: 120 })
  plan_name: string;

  @Column('text', { nullable: true })
  plan_description: string | null;

  @Column('numeric', { precision: 14, scale: 2 })
  plan_price: string;

  @Column('char', { length: 3 })
  plan_currency: string;

  @Column('varchar', { length: 12, nullable: true })
  billing_interval: 'monthly' | 'yearly' | null;
  @Column('varchar', { length: 12, nullable: true })
  plan_type: 'trial' | 'paid' | null;
  @Column('varchar', { length: 12, nullable: true })
  interval_unit: 'day' | 'month' | 'year' | null;
  @Column('int', { nullable: true })
  interval_count: number | null;

  @Column('jsonb', { default: () => "'{}'::jsonb" })
  plan_limits_benefits: Record<string, unknown>;

  @Column('int', { default: 0 })
  grace_period_days: number;

  @Column('varchar', { length: 24 })
  status: string;

  @Column({ type: 'timestamptz' })
  starts_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  grace_until: Date | null;

  @Column('text', { nullable: true })
  perpetual_free_reason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  perpetual_free_granted_at: Date | null;

  @Column('int', { nullable: true })
  perpetual_free_granted_by: number | null;

  @Column('text', { nullable: true })
  suspension_reason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  suspended_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at: Date | null;

  @Column('text', { nullable: true })
  status_reason: string | null;

  @Column('boolean', { default: true })
  is_current: boolean;

  @Column('int')
  created_by: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  ended_at: Date | null;
}
