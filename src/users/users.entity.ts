import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne } from 'typeorm';
@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 500, nullable: true })
  password: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('varchar', { length: 100, unique: true })
  user_name: string;
  @Column('varchar', { length: 50, nullable: true })
  college_number: string;

  @Column('varchar', { length: 20 })
  telephone: string;

  @Column('varchar', { length: 50, nullable: true })
  key_signing: string;

  @Column('varchar', { length: 100, nullable: true })
  url_photo: string;

  @Column('varchar', { length: 100, nullable: true })
  url_signature: string;

  @Column('varchar', { length: 100, nullable: true })
  direction: string;

  @Column('varchar', { length: 50, nullable: true })
  position: string;

  @Column('varchar', { length: 100, nullable: true, unique: true })
  email: string;

  @Column('int', { default: () => '0', nullable: true })
  key_recover: number;

  @Column('tinyint', { default: () => '0', nullable: true })
  request_password: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column('varchar', { length: 100, default: 'user' })
  roles: string;

  @Column('varchar', { length: 500, nullable: true })
  passwordSignature: string;

  @Column('tinyint', { default: () => '0', nullable: false })
  hide_user: boolean;

}
