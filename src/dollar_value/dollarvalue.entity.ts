import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'dollar_value' })
export class Dollarvalue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'registered_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  registeredAt: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  value: number;

  @Column({ type: 'varchar', length: 20, default: 'UNKNOWN' })
  source: 'BCV' | 'DOLAR_API' | 'OTHER' | 'UNKNOWN';

  @Column({ name: 'update_method', type: 'varchar', length: 20, default: 'UNKNOWN' })
  updateMethod: 'AUTOMATIC' | 'MANUAL' | 'UNKNOWN';
}
