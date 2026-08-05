import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, NumericType, OneToMany} from 'typeorm';

@Entity({name: 'client'})
export class Client {
    @PrimaryGeneratedColumn()
    id: number

    @Column('varchar', {length: 100, nullable: true})
    business_name: string

    @Column('varchar', {length: 200, nullable: true})
    address: string

    @Column('varchar', {length: 20, nullable: true})
    phone: string

    @Column('varchar', {length: 60, nullable: true})
    person_charge: string

    @Column({type: 'decimal', precision: 18, scale: 2, default: () => '0.00'})
    discount: number

    @Column('varchar', {length: 20, nullable: true})
    rif: string

    @Column('tinyint', {default: () => '0'})
    Print_invoice: boolean

    @Column('tinyint', {default: () => '0'})
    hide_client: boolean

    @Column({type:'smallint', default: 1})
    tariff: number

    @Column('tinyint', {default: 1})
    credit: boolean

    @Column('tinyint', {default: () => '0'})
    charge_dollars: boolean
}
