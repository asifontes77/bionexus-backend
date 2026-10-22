import {
  Entity,
  Column,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tariff } from '../tariffs/tariff.entity';

@Entity({ name: 'client' })
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 100, nullable: true })
  business_name: string;

  @Column('varchar', { length: 200, nullable: true })
  address: string;

  @Column('varchar', { length: 20, nullable: true })
  phone: string;

  @Column('varchar', { length: 60, nullable: true })
  person_charge: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  discount: number;

  @Column('varchar', { length: 20, nullable: true })
  rif: string;

  @Column('boolean', { default: false })
  Print_invoice: boolean;

  @Column('boolean', { default: false })
  hide_client: boolean;

  @Column({ type: 'smallint', default: 1 })
  tariff: number;

  @Column('int', { name: 'tariff_id', nullable: true, default: null })
  tariff_id: number | null;

  @ManyToOne(() => Tariff, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({ name: 'tariff_id' })
  tariffRelation: Tariff | null;

  @Column('boolean', { default: true })
  credit: boolean;

  @Column('boolean', { default: false })
  charge_dollars: boolean;
}
