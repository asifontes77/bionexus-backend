import { Examlists } from 'src/exam_lists/examlists.entity';
import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, OneToOne} from 'typeorm';
import { Exam } from 'src/exams/exams.entity';

@Entity({name: 'exam_group'})
export class Examgroup {
    @PrimaryGeneratedColumn()
    id: number

    @Column('varchar', {length: 150})
    description: string

    @Column('tinyint', {default: 1})
    annulled: boolean

    @Column('int')
    position: number

    @Column('tinyint', {default: 1})
    its_exam: boolean
  
    @Column({type: 'datetime', default: () => 'CURRENT_TIMESTAMP'})
    createdAt: Date

    @Column({type: 'datetime', default: () => 'CURRENT_TIMESTAMP'})
    updatedAt: Date

    @OneToMany(() => Examlists, (examlists) => examlists.examgroup)
    examlists: Examlists[]

    @OneToMany(() => Exam, (exam) => exam.examGroup)
    exam: Exam;
}