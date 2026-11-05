import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'platform_subscription_payments' })
@Index('UQ_platform_subscription_payments_idempotency', ['laboratory_id', 'idempotency_key'], { unique: true })
export class PlatformSubscriptionPayment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column('bigint')
  subscription_id: string;

  @Column('int')
  laboratory_id: number;

  @Column({ type: 'timestamptz' })
  paid_at: Date;

  @Column('numeric', { precision: 14, scale: 2 })
  amount: string;

  @Column('char', { length: 3 })
  currency: string;

  @Column('varchar', { length: 80 })
  method: string;

  @Column('varchar', { length: 160, nullable: true })
  reference: string | null;

  @Column({ type: 'timestamptz' })
  period_start: Date;

  @Column({ type: 'timestamptz' })
  period_end: Date;

  @Column('varchar', { length: 128 })
  idempotency_key: string;

  @Column('text', { nullable: true })
  proof_storage_key: string | null;

  @Column('varchar', { length: 100, nullable: true })
  proof_content_type: string | null;

  @Column('int')
  recorded_by: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;
}
