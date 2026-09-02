import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { special_test_lab } from 'src/special_test_lab/special_test_lab.entity';
import { Examlists } from 'src/exam_lists/examlists.entity';
@Entity({ name: 'special_test_items' })
export class special_test_items {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { default: () => '0' })
  specialTestLabId: number;

  @Column('int', { default: () => '0' })
  exam_list_Id: number;

  @Column({ type: 'char', length: 60 })
  description: string;

  @ManyToOne(() => Examlists, { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' })
  @JoinColumn({ name: 'exam_list_Id' })
  examCatalog: Examlists;

  @ManyToOne(
    () => special_test_lab,
    (specialTestLab) => specialTestLab.specialTestItems,
    { onDelete: 'CASCADE' },
  )
  specialTestLab: special_test_lab;
}
