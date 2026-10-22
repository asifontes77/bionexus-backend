import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Waypayitems } from 'src/way_pay_items/waypayitems.entity';

@Entity({ name: 'way_pay' })
export class Waypay {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  id_users: number;

  @Column('int')
  id_patients: number;

  @Column('int')
  id_client: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  date_patients: Date;

  @Column('boolean', { default: false })
  annulment: boolean;

  @OneToMany(() => Waypayitems, (waypayitems) => waypayitems.waypays)
  waypayitems: Waypayitems[];
}
