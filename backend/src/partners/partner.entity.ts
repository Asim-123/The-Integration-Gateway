import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Job } from '../jobs/job.entity';

@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'api_key_hash' })
  apiKeyHash: string;

  @Column({ name: 'api_key_prefix', length: 8 })
  apiKeyPrefix: string;

  @Column({ name: 'callback_url', type: 'varchar', nullable: true })
  callbackUrl: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Job, (job) => job.partner)
  jobs: Job[];
}
