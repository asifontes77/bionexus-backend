import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'routines' })
export class Routines {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  description: string;

  @Column({ type: 'json', nullable: true })
  registered_exams: string;

  @Column('varchar', { length: 200 })
  details: string;
}
