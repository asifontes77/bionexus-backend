import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'list_germs'})
export class listGerms {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 50, nullable: true })
  germen: string;

  
  @Column('tinyint', { default: () => 0 })
  annulled: boolean;
}
