import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ExamTariffPrice } from './exam-tariff-price.entity';

@Entity({ name: 'tariffs' })
export class Tariff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 60, unique: true })
  code: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('varchar', { length: 250, nullable: true })
  description: string | null;

  @Column('varchar', { name: 'currency_code', length: 3, default: 'USD' })
  currencyCode: string;

  @Column('int')
  position: number;

  @Column('tinyint', { name: 'is_default', default: 0 })
  isDefault: boolean;

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

  @OneToMany(() => ExamTariffPrice, (price) => price.tariff)
  prices: ExamTariffPrice[];
}
