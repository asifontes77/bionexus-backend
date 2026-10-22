import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tax' })
export class Tax {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 20 })
  description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  value: number;

  @Column('boolean', { default: false, nullable: true })
  only_dollars: boolean;

  @Column('boolean', { default: false, nullable: true })
  always_subtotal: boolean;

  @Column('boolean', { default: false, nullable: false })
  hide: boolean;
}
