import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'parasiticforms' })
export class Parasiticforms {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 50 })
  description: string;

  @Column('tinyint', { default: () => '0' })
  annulled: boolean;
}
