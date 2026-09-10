import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Examlists } from '../exam_lists/examlists.entity';
import { Tariff } from './tariff.entity';

@Entity({ name: 'exam_tariff_prices' })
@Unique('UQ_exam_tariff_prices_exam_tariff', ['examCatalogId', 'tariffId'])
export class ExamTariffPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { name: 'exam_catalog_id' })
  examCatalogId: number;

  @Column('int', { name: 'tariff_id' })
  tariffId: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  price: number;

  @Column('tinyint', { name: 'is_active', default: 1 })
  isActive: boolean;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ManyToOne(() => Examlists, { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' })
  @JoinColumn({ name: 'exam_catalog_id' })
  examCatalog: Examlists;

  @ManyToOne(() => Tariff, (tariff) => tariff.prices, {
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({ name: 'tariff_id' })
  tariff: Tariff;
}
