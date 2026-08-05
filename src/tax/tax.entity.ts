import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tax' })
export class Tax {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 20 })
  description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  value: number;

  @Column('tinyint', { default: () => '0', nullable: true })
  only_dollars: boolean;

  @Column('tinyint', { default: () => '0', nullable: true })
  always_subtotal: boolean;

  @Column('tinyint', { default: () => '0', nullable: false })
  hide: boolean;
}
