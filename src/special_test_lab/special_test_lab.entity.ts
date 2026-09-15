import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { special_test_items } from 'src/special_test_items/special_test_items.entity';
@Entity({ name: 'special_test_lab' })
export class special_test_lab {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 60 })
  description: string;
  @Column('varchar', { length: 200, default: '' })
  details: string;

  @Column('varchar', { length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 30 })
  phone_1: string;

  @Column({ type: 'varchar', length: 30 })
  phone_2: string;

  @Column('varchar', { length: 100 })
  email: string;

  @Column('tinyint', { default: () => '0', nullable: true })
  annulled: boolean;

  // Relación OneToMany
  @OneToMany(
    () => special_test_items,
    (specialTestItem) => specialTestItem.specialTestLab,
    { cascade: true },
  )
  specialTestItems: special_test_items[];
}
