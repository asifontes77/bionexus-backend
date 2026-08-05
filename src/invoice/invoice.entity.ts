import { Invoiceitems } from 'src/invoice_items/invoiceitems.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity({ name: 'invoice' })
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { default: () => '0' })
  no_invoice: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @Column('varchar', { length: 30, default: 'Factura' })
  document_type: string;

  @Column('int', { default: () => '0' })
  id_patients: number;

  @Column('int', { default: () => '0' })
  id_client: number;

  @Column('varchar', { length: 100 })
  business_name: string;

  @Column('varchar', { length: 20 })
  rif: string;

  @Column('varchar', { length: 250 })
  address: string;

  @Column('int', { default: () => '0' })
  id_users: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  subtotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  discount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  discount_total: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  iva: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  iva_total: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  tax_base: number;

  @Column('tinyint', { default: () => '0' })
  deleted: boolean;

  @Column('tinyint', { default: 1 })
  paying: boolean;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  total: number;

  @Column({ type: 'json', nullable: true })
  foot_payments: string;

  @OneToMany(() => Invoiceitems, (invoiceitems) => invoiceitems.invoice)
  invoiceitems: Invoiceitems[];
}
