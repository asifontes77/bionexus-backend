import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TypePayment } from './typepayment.entity';

export type PaymentFieldType = 'text' | 'number' | 'date' | 'phone' | 'reference' | 'select' | 'bank' | 'boolean';

@Entity({ name: 'payment_method_fields' })
export class PaymentMethodField {
  @PrimaryGeneratedColumn() id: number;
  @Column('int', { name: 'payment_method_id' }) paymentMethodId: number;
  @Column('varchar', { length: 50 }) code: string;
  @Column('varchar', { length: 100 }) label: string;
  @Column('varchar', { name: 'field_type', length: 30 }) fieldType: PaymentFieldType;
  @Column('tinyint', { name: 'is_required', default: 0 }) isRequired: boolean;
  @Column('int', { name: 'display_order', default: 0 }) displayOrder: number;
  @Column('int', { name: 'min_length', nullable: true }) minLength: number | null;
  @Column('int', { name: 'max_length', nullable: true }) maxLength: number | null;
  @Column('varchar', { name: 'input_mask', length: 100, nullable: true }) inputMask: string | null;
  @Column('varchar', { name: 'validation_pattern', length: 255, nullable: true }) validationPattern: string | null;
  @Column('varchar', { name: 'help_text', length: 255, nullable: true }) helpText: string | null;
  @Column('varchar', { name: 'catalog_source', length: 30, nullable: true }) catalogSource: string | null;
  @Column('tinyint', { name: 'is_active', default: 1 }) isActive: boolean;
  @ManyToOne(() => TypePayment, (method) => method.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_method_id' }) paymentMethod: TypePayment;
}
