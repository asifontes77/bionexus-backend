import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn} from 'typeorm';
import { Invoice } from 'src/invoice/invoice.entity';
@Entity({name: 'invoice_items'})
export class Invoiceitems {
    @PrimaryGeneratedColumn()
    id: number

    @Column('int', {default: () => '0'})
    id_invoice: number

    @Column('int', {default: () => '0'})
    quantity: number

    @Column('varchar', {length: 60})
    description: string

    @Column({type: 'decimal', precision: 18, scale: 2, default: () => '0.00'})
    amount: number

    @Column('int', {default: () => '0'})
    id_exams: number

    @Column({type: 'decimal', precision: 18, scale: 2, default: () => '0.00'})
    total: number

    @ManyToOne(() => Invoice, (invoice) => invoice.invoiceitems)
    @JoinColumn({ name: 'id_invoice' })
    invoice: Invoice
}
