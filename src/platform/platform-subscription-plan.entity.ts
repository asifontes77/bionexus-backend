import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'platform_subscription_plans' })
export class PlatformSubscriptionPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 80 })
  code: string;

  @Column('varchar', { length: 120 })
  name: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('numeric', { precision: 14, scale: 2 })
  price: string;

  @Column('char', { length: 3 })
  currency: string;

  @Column('varchar', { length: 12 })
  billing_interval: 'monthly' | 'yearly';
  @Column('varchar', { length: 12 })
  plan_type: 'trial' | 'paid';
  @Column('varchar', { length: 12 })
  interval_unit: 'day' | 'month' | 'year';
  @Column('int')
  interval_count: number;

  @Column('int', { default: 0 })
  grace_period_days: number;

  @Column('jsonb', { default: () => "'{}'::jsonb" })
  limits_benefits: Record<string, unknown>;

  @Column('boolean', { default: true })
  is_active: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at: Date;
}
