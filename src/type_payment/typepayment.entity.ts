import {Entity, Column, PrimaryGeneratedColumn, OneToMany} from 'typeorm';

@Entity({name: 'type_payment'})
export class TypePayment {
    @PrimaryGeneratedColumn()
    id: number

    @Column('varchar', {length: 50, nullable: true})
    description: string
    
    @Column('varchar', {length: 50, nullable: true})
    description_1: string
    
    @Column('varchar', {length: 50, nullable: true})
    description_2: string

    @Column('tinyint', { default: () => 0 })
    annulled: boolean;

    @Column('tinyint', { default: () => 0, nullable: true })
    only_dollars: boolean;
}