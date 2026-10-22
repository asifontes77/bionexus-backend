import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'parasiticforms' })
export class Parasiticforms {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 50, unique: true })
  description: string;

  @Column('boolean', { default: false })
  annulled: boolean;
}
