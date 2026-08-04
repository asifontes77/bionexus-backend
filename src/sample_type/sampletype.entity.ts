import {Entity, Column, PrimaryGeneratedColumn, OneToMany} from 'typeorm';

@Entity({name: 'sample_type'})
export class SampleType {
    @PrimaryGeneratedColumn()
    id: number

    @Column('varchar', {length: 50, nullable: true})
    description: string
}