import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'license' })
export class License {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 255 })
  licenseKey: string;

  @Column('boolean')
  isActive: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;
}
