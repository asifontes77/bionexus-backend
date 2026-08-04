import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { special_test_lab } from 'src/special_test_lab/special_test_lab.entity';
@Entity({ name: 'special_test_items' })
export class special_test_items {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', {default: () => 0})
  specialTestLabId: number;
  
  @Column('int', {default: () => 0})
  exam_list_Id: number;
  
  @Column({ type: 'char', length: 60 })
  description: string;

  @ManyToOne(() => special_test_lab, (specialTestLab) => specialTestLab.specialTestItems, { onDelete: 'CASCADE' })
  specialTestLab: special_test_lab;
}