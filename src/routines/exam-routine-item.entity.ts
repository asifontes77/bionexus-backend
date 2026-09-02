import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Examlists } from '../exam_lists/examlists.entity';
import { Routines } from './routines.entity';

@Entity({ name: 'exam_routine_items' })
export class ExamRoutineItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  routine_id: number;

  @Column('int')
  exam_catalog_id: number;

  @Column('int')
  position: number;

  @Column('tinyint', { default: 1 })
  is_active: boolean;

  @Column('tinyint', { default: 0 })
  legacy_active_present: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @ManyToOne(() => Routines, (routine) => routine.items, { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' })
  @JoinColumn({ name: 'routine_id' })
  routine: Routines;

  @ManyToOne(() => Examlists, { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' })
  @JoinColumn({ name: 'exam_catalog_id' })
  examCatalog: Examlists;
}
