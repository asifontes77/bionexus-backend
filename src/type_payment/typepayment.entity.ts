import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentMethodCurrency } from './payment-method-currency.entity';
import { PaymentMethodField } from './payment-method-field.entity';

@Entity({ name: 'type_payment' })
export class TypePayment {
  @PrimaryGeneratedColumn() id: number;
  @Column('varchar', { length: 50 }) code: string;
  @Column('varchar', { length: 100 }) description: string;
  @Column('int', { name: 'display_order', default: 0 }) displayOrder: number;
  @Column('tinyint', { default: 0 }) annulled: boolean;
  @OneToMany(() => PaymentMethodCurrency, (item) => item.paymentMethod) currencies: PaymentMethodCurrency[];
  @OneToMany(() => PaymentMethodField, (field) => field.paymentMethod) fields: PaymentMethodField[];
}
