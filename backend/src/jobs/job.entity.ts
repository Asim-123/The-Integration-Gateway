import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Partner } from '../partners/partner.entity';
import { JobAttachment } from './job-attachment.entity';
import { JobStatus } from './job-status.enum';

@Entity('jobs')
@Index(['partnerId', 'idempotencyKey'], {
  unique: true,
  where: '"idempotency_key" IS NOT NULL',
})
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'partner_id' })
  partnerId: string;

  @ManyToOne(() => Partner, (partner) => partner.jobs)
  @JoinColumn({ name: 'partner_id' })
  partner: Partner;

  @Column({ name: 'idempotency_key', type: 'varchar', nullable: true })
  idempotencyKey: string | null;

  @Column({ name: 'payload_hash', type: 'varchar', nullable: true })
  payloadHash: string | null;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.ACCEPTED })
  status: JobStatus;

  @Column({ type: 'jsonb' })
  metadata: Record<string, unknown>;

  @Column({ name: 'callback_url' })
  callbackUrl: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'report_path', type: 'varchar', nullable: true })
  reportPath: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', nullable: true, type: 'timestamptz' })
  completedAt: Date | null;

  @OneToMany(() => JobAttachment, (attachment) => attachment.job, {
    cascade: true,
  })
  attachments: JobAttachment[];
}
