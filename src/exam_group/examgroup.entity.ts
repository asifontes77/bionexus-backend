import {
  Examlists } from 'src/exam_lists/examlists.entity';
import { Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { Exam } from 'src/exams/exams.entity';

@Entity({ name: 'exam_group' })
export class Examgroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 150 })
  description: string;

  @Column('boolean', { default: true })
  annulled: boolean;

  @Column('int')
  position: number;

  @Column('boolean', { default: true })
  its_exam: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => Examlists, (examlists) => examlists.examgroup)
  examlists: Examlists[];

  @OneToMany(() => Exam, (exam) => exam.examGroup)
  exam: Exam;
}
