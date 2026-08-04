import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Waypay } from 'src/way_pay/waypay.entity';
@Entity({ name: 'way_pay_items' })
export class Waypayitems {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  id_way_pay: number;

  @Column('int', { default: () => 0 })
  id_type_payment: number;

  @Column('varchar', { length: 50 })
  description_1: string;

  @Column('varchar', { length: 50 })
  description_2: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  amountDollar: number;
  
  @Column('tinyint', { default: () => 0 })
  dollar: boolean;

  @Column('varchar', { length: 20, nullable: true })
  dollar_value: string;

  @Column('varchar', { length: 20, nullable: true })
  dollar_date: string;

  @ManyToOne(() => Waypay, (waypay) => waypay.waypayitems)
  @JoinColumn({ name: 'id_way_pay' })
  waypays: Waypay;
}
