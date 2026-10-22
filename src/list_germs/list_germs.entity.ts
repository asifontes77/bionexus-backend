import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'list_germs' })
export class listGerms {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 50, nullable: false })
  germen: string;

  @Column('boolean', { default: false })
  annulled: boolean;
}
