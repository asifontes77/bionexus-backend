import {Entity, Column, PrimaryGeneratedColumn, OneToMany} from 'typeorm';

@Entity({name: 'dollar_value'})
export class Dollarvalue {
    @PrimaryGeneratedColumn()
    id: number

    @Column({type: 'datetime', default: () => 'CURRENT_TIMESTAMP'})
    date: Date

    @Column({type: 'decimal', precision: 18, scale: 2, default: () => '0.00'})
    value: number
}
