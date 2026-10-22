import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'antibiotic' })
export class Antibiotic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 50 })
  description: string;

  @Column('varchar', { length: 10 })
  siglas: string;

  @Column('boolean', { default: false })
  annulled: boolean;
}
