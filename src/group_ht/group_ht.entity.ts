import { Grouphtitems } from 'src/group_ht_items/group_ht_items.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity({ name: 'group_ht' })
export class Groupht {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 50 })
  description: string;

  @Column('varchar', { length: 200 })
  details: string;

  @Column('tinyint', { default: () => 0 })
  annulled: boolean;

  @OneToMany(() => Grouphtitems, (grouphtitems) => grouphtitems.groupht)
  grouphtitems: Grouphtitems[];
}
