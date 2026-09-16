import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'sample_type' })
export class SampleType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 50, nullable: true })
  description: string;
  @Column('tinyint', { default: 0 })
  annulled: boolean;
}
