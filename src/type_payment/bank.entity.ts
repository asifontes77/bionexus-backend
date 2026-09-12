import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'banks' })
export class Bank {
  @PrimaryGeneratedColumn() id: number;
  @Column('varchar', { length: 30 }) code: string;
  @Column('varchar', { length: 120 }) name: string;
  @Column('varchar', { name: 'short_name', length: 60, nullable: true }) shortName: string | null;
  @Column('tinyint', { name: 'is_active', default: 1 }) isActive: boolean;
  @Column('int', { name: 'display_order', default: 0 }) displayOrder: number;
}
