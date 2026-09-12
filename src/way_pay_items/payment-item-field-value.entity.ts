import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Bank } from '../type_payment/bank.entity';
import { PaymentMethodField } from '../type_payment/payment-method-field.entity';
import { Waypayitems } from './waypayitems.entity';

@Entity({ name: 'payment_item_field_values' })
export class PaymentItemFieldValue {
  @PrimaryGeneratedColumn({ type: 'bigint' }) id: string;
  @Column('int', { name: 'payment_item_id' }) paymentItemId: number;
  @Column('int', { name: 'field_id', nullable: true }) fieldId: number | null;
  @Column('varchar', { name: 'field_code', length: 50 }) fieldCode: string;
  @Column('varchar', { name: 'field_label', length: 100 }) fieldLabel: string;
  @Column('varchar', { name: 'field_type', length: 30 }) fieldType: string;
  @Column('varchar', { name: 'value_text', length: 500, nullable: true }) valueText: string | null;
  @Column('int', { name: 'bank_id', nullable: true }) bankId: number | null;
  @ManyToOne(() => Waypayitems, (item) => item.fieldValues, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'payment_item_id' }) paymentItem: Waypayitems;
  @ManyToOne(() => PaymentMethodField, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'field_id' }) field: PaymentMethodField | null;
  @ManyToOne(() => Bank, { nullable: true, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'bank_id' }) bank: Bank | null;
}
