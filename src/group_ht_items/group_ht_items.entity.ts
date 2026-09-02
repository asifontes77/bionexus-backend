import { Groupht } from 'src/group_ht/group_ht.entity';
import { Examlists } from 'src/exam_lists/examlists.entity';
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

  @ManyToOne(() => Examlists, { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' })
  @JoinColumn({ name: 'examId' })
  examCatalog: Examlists;

  @ManyToOne(() => Groupht, (groupht) => groupht.grouphtitems)
  @JoinColumn({ name: 'groupHtId' })
  groupht: Groupht;
}
