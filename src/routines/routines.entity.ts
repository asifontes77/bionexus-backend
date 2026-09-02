import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ExamRoutineItem } from './exam-routine-item.entity';

@Entity({ name: 'exam_routines' })
export class Routines {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  description: string;

  @Column({ type: 'json', nullable: true })
  registered_exams: string;

  @Column('varchar', { length: 200 })
  details: string;

  @OneToMany(() => ExamRoutineItem, (item) => item.routine)
  items: ExamRoutineItem[];
}
