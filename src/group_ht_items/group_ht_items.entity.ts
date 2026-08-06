import { Groupht } from 'src/group_ht/group_ht.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity({ name: 'group_ht_items' })
export class Grouphtitems {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { default: () => '0' })
  groupHtId: number;

  @Column('int', { default: () => '0' })
  examId: number;

  @Column('varchar', { length: 60 })
  description: string;

  @ManyToOne(() => Groupht, (groupht) => groupht.grouphtitems)
  @JoinColumn({ name: 'groupHtId' })
  groupht: Groupht;
}
