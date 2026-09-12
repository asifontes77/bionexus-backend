import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Currency } from '../type_payment/currency.entity';
import { TypePayment } from '../type_payment/typepayment.entity';
import { Waypay } from '../way_pay/waypay.entity';
import { PaymentItemFieldValue } from './payment-item-field-value.entity';

@Entity({ name: 'way_pay_items' })
export class Waypayitems {
  @PrimaryGeneratedColumn() id: number;
  @Column('int', { name: 'id_way_pay' }) id_way_pay: number;
  @Column('int', { name: 'id_type_payment' }) id_type_payment: number;
  @Column('int', { name: 'currency_id' }) currencyId: number;
  @Column('decimal', { name: 'entered_amount', precision: 18, scale: 2 }) enteredAmount: number;
  @Column('decimal', { name: 'base_amount', precision: 18, scale: 2 }) baseAmount: number;
  @Column('decimal', { name: 'local_equivalent_amount', precision: 18, scale: 2 }) localEquivalentAmount: number;
  @Column('decimal', { name: 'exchange_rate', precision: 18, scale: 6, nullable: true }) exchangeRate: number | null;
  @Column('tinyint', { name: 'exchange_rate_decimal_places', unsigned: true, nullable: true }) exchangeRateDecimalPlaces: number | null;
  @Column('datetime', { name: 'exchange_rate_date', nullable: true }) exchangeRateDate: Date | null;
  @ManyToOne(() => Waypay, (waypay) => waypay.waypayitems) @JoinColumn({ name: 'id_way_pay' }) waypays: Waypay;
  @ManyToOne(() => TypePayment, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'id_type_payment' }) paymentMethod: TypePayment;
  @ManyToOne(() => Currency, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'currency_id' }) currency: Currency;
  @OneToMany(() => PaymentItemFieldValue, (value) => value.paymentItem) fieldValues: PaymentItemFieldValue[];
}
