import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Currency } from './currency.entity';
import { TypePayment } from './typepayment.entity';

@Entity({ name: 'payment_method_currencies' })
export class PaymentMethodCurrency {
  @PrimaryColumn('int', { name: 'payment_method_id' }) paymentMethodId: number;
  @PrimaryColumn('int', { name: 'currency_id' }) currencyId: number;
  @Column('boolean', { name: 'is_default', default: false }) isDefault: boolean;
  @Column('boolean', { name: 'is_active', default: true }) isActive: boolean;
  @Column('int', { name: 'display_order', default: 0 }) displayOrder: number;
  @ManyToOne(() => TypePayment, (method) => method.currencies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_method_id' }) paymentMethod: TypePayment;
  @ManyToOne(() => Currency, (currency) => currency.paymentMethods, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currency_id' }) currency: Currency;
}
