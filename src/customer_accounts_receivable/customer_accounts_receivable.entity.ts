import { UpdateDateColumn, Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'customer_accounts_receivable' })
export class Customeraccountsreceivable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { default: () => '0' })
  client_id: number;

  @Column('varchar', { length: 250, nullable: true })
  invoice: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  total: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  total_dollars: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  total_canceled: number;

  @Column('int', { default: () => '0' })
  user_id_canceled: number;

  @Column({ type: 'timestamptz', nullable: true })
  date_canceled: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
