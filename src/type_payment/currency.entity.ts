import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentMethodCurrency } from './payment-method-currency.entity';

@Entity({ name: 'currencies' })
export class Currency {
  @PrimaryGeneratedColumn() id: number;
  @Column('char', { length: 3 }) code: string;
  @Column('varchar', { length: 80 }) name: string;
  @Column('varchar', { length: 12 }) symbol: string;
  @Column('varchar', { name: 'symbol_position', length: 8, default: 'before' }) symbolPosition: 'before' | 'after';
  @Column('tinyint', { name: 'decimal_places', unsigned: true, default: 2 }) decimalPlaces: number;
  @Column('tinyint', { name: 'is_local', default: 0 }) isLocal: boolean;
  @Column('tinyint', { name: 'is_base', default: 0 }) isBase: boolean;
  @Column('tinyint', { name: 'is_active', default: 1 }) isActive: boolean;
  @Column('int', { name: 'display_order', default: 0 }) displayOrder: number;
  @OneToMany(() => PaymentMethodCurrency, (item) => item.currency) paymentMethods: PaymentMethodCurrency[];
}
