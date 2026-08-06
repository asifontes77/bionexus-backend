import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'cash_register' })
export class cash_register {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { default: () => '0' })
  user_id: number;

  @Column({ type: 'date' })
  admission_date: Date;

  @Column({ type: 'json', nullable: true })
  deposits: string;

  @Column({ type: 'json', nullable: true })
  totals: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
