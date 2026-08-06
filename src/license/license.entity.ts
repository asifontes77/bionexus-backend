import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'license' })
export class License {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 255 })
  licenseKey: string;

  @Column('tinyint')
  isActive: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date;
}
