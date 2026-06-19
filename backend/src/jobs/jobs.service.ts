import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '../common/api-error';
import { DownloadsService } from '../downloads/downloads.service';
import { PdfService } from '../pdf/pdf.service';
import { StorageService } from '../storage/storage.service';
import { WebhookDeliveryStatus } from '../webhooks/webhook-delivery-status.enum';
import { WebhookDelivery } from '../webhooks/webhook-delivery.entity';
import { WebhooksService } from '../webhooks/webhooks.service';
import { JobAttachment } from './job-attachment.entity';
import { JobMetadataDto } from './job-metadata.dto';
import { Job } from './job.entity';
import { JobStatus } from './job-status.enum';
import { QueueDispatcher } from '../queue/queue-dispatcher.service';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
const MAX_FILES = 10;

export const JOB_PROCESSING_QUEUE = 'job-processing';
export const WEBHOOK_DELIVERY_QUEUE = 'webhook-delivery';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    @InjectRepository(JobAttachment)
    private readonly attachmentsRepository: Repository<JobAttachment>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveriesRepository: Repository<WebhookDelivery>,
    private readonly queueDispatcher: QueueDispatcher,
    private readonly storageService: StorageService,
    private readonly pdfService: PdfService,
    private readonly downloadsService: DownloadsService,
    private readonly webhooksService: WebhooksService,
  ) {}

  async createJob(
    partnerId: string,
    metadataRaw: string,
    files: Express.Multer.File[],
    idempotencyKey?: string,
  ) {
    const metadata = await this.parseMetadata(metadataRaw);
    this.validateFiles(files);

    const payloadHash = this.computePayloadHash(metadata, files);

    if (idempotencyKey) {
      const existing = await this.jobsRepository.findOne({
        where: { partnerId, idempotencyKey },
        relations: { attachments: true },
      });
      if (existing) {
        if (existing.payloadHash !== payloadHash) {
          throw new ApiError(
            'IDEMPOTENCY_CONFLICT',
            'Idempotency key reused with different payload',
            409,
          );
        }
        return this.toAcceptedResponse(existing);
      }
    }

    const savedPaths: string[] = [];
    const queryRunner = this.jobsRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const job = queryRunner.manager.create(Job, {
        partnerId,
        idempotencyKey: idempotencyKey ?? null,
        payloadHash,
        status: JobStatus.ACCEPTED,
        metadata: metadata as unknown as Record<string, unknown>,
        callbackUrl: metadata.callbackUrl,
      });
      const savedJob = await queryRunner.manager.save(job);

      for (const file of files) {
        const relativePath = `attachments/${savedJob.id}/${uuidv4()}.enc`;
        await this.storageService.saveEncrypted(relativePath, file.buffer);
        savedPaths.push(relativePath);
        await queryRunner.manager.save(JobAttachment, {
          jobId: savedJob.id,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storagePath: relativePath,
        });
      }

      await queryRunner.commitTransaction();
      await this.queueDispatcher.enqueueJobProcessing(savedJob.id);

      const fullJob = await this.jobsRepository.findOne({
        where: { id: savedJob.id },
        relations: { attachments: true },
      });

      return this.toAcceptedResponse(fullJob!);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      for (const path of savedPaths) {
        await this.storageService.delete(path);
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async listJobs(partnerId: string) {
    const jobs = await this.jobsRepository.find({
      where: { partnerId },
      order: { createdAt: 'DESC' },
      relations: { attachments: true },
    });
    return Promise.all(jobs.map((job) => this.toJobResponse(job, partnerId)));
  }

  async getJobForPartner(jobId: string, partnerId: string) {
    const job = await this.jobsRepository.findOne({
      where: { id: jobId, partnerId },
      relations: { attachments: true },
    });
    if (!job) {
      throw new ApiError('JOB_NOT_FOUND', 'Job not found', 404);
    }
    return job;
  }

  async getJobResponse(jobId: string, partnerId: string) {
    const job = await this.getJobForPartner(jobId, partnerId);
    return this.toJobResponse(job, partnerId);
  }

  async findById(jobId: string) {
    return this.jobsRepository.findOne({
      where: { id: jobId },
      relations: { attachments: true },
    });
  }

  async getReportBuffer(job: Job): Promise<Buffer> {
    if (!job.reportPath) {
      throw new ApiError('JOB_NOT_FOUND', 'Report not available', 404);
    }
    return this.storageService.readEncrypted(job.reportPath);
  }

  async retryWebhook(jobId: string, partnerId: string) {
    const job = await this.getJobForPartner(jobId, partnerId);
    if (job.status !== JobStatus.COMPLETED) {
      throw new ApiError(
        'VALIDATION_ERROR',
        'Webhook retry is only available for completed jobs',
        400,
      );
    }
    const delivery = await this.webhooksService.createDelivery(job);
    await this.queueDispatcher.enqueueWebhookDelivery(delivery.id, 0);
    return { deliveryId: delivery.id, eventId: delivery.eventId, status: 'queued' };
  }

  async processJob(jobId: string) {
    const job = await this.jobsRepository.findOne({
      where: { id: jobId },
      relations: { attachments: true },
    });
    if (!job || job.status !== JobStatus.ACCEPTED) return;

    job.status = JobStatus.PROCESSING;
    await this.jobsRepository.save(job);

    try {
      await this.sleep(2000 + Math.floor(Math.random() * 8000));
      if (Math.random() < 0.15) {
        throw new Error('Simulated processing failure');
      }

      let preview: Buffer | undefined;
      const first = job.attachments[0];
      if (first && first.mimeType.startsWith('image/')) {
        preview = await this.storageService.readEncrypted(first.storagePath);
      }

      const pdf = await this.pdfService.generateReport(job, preview);
      const reportPath = `reports/${job.id}.enc`;
      await this.storageService.saveEncrypted(reportPath, pdf);

      job.status = JobStatus.COMPLETED;
      job.reportPath = reportPath;
      job.completedAt = new Date();
      job.errorMessage = null;
      await this.jobsRepository.save(job);

      const delivery = await this.webhooksService.createDelivery(job);
      await this.queueDispatcher.enqueueWebhookDelivery(delivery.id, 0);
    } catch (error) {
      job.status = JobStatus.FAILED;
      job.errorMessage =
        error instanceof Error ? error.message : 'Processing failed';
      await this.jobsRepository.save(job);
      throw error;
    }
  }

  async deliverWebhook(deliveryId: string) {
    const delivery = await this.deliveriesRepository.findOne({
      where: { id: deliveryId },
      relations: { job: true },
    });
    if (!delivery || delivery.status === WebhookDeliveryStatus.DELIVERED) {
      return;
    }

    const attempt = delivery.attemptCount + 1;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.webhooksService.signPayload(delivery.payload, timestamp);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(delivery.job.callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `t=${timestamp},v1=${signature}`,
          'X-Webhook-Event-Id': delivery.eventId,
        },
        body: JSON.stringify(delivery.payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      delivery.attemptCount = attempt;
      delivery.lastAttemptAt = new Date();
      delivery.lastResponseCode = response.status;

      if (response.ok) {
        delivery.status = WebhookDeliveryStatus.DELIVERED;
        delivery.lastError = null;
        delivery.nextRetryAt = null;
        await this.deliveriesRepository.save(delivery);
        return;
      }

      delivery.lastError = `HTTP ${response.status}`;
      await this.scheduleRetry(delivery, attempt);
    } catch (error) {
      delivery.attemptCount = attempt;
      delivery.lastAttemptAt = new Date();
      delivery.lastResponseCode = null;
      delivery.lastError =
        error instanceof Error ? error.message : 'Webhook delivery failed';
      await this.scheduleRetry(delivery, attempt);
    }
  }

  private async scheduleRetry(delivery: WebhookDelivery, attempt: number) {
    const delay = this.webhooksService.getRetryDelayMs(attempt);
    if (delay === null) {
      delivery.status = WebhookDeliveryStatus.DEAD_LETTER;
      delivery.nextRetryAt = null;
      await this.deliveriesRepository.save(delivery);
      return;
    }

    delivery.status = WebhookDeliveryStatus.FAILED;
    delivery.nextRetryAt = new Date(Date.now() + delay);
    await this.deliveriesRepository.save(delivery);
    await this.queueDispatcher.enqueueWebhookDelivery(delivery.id, delay);
  }

  private async parseMetadata(metadataRaw: string): Promise<JobMetadataDto> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(metadataRaw);
    } catch {
      throw new ApiError('VALIDATION_ERROR', 'metadata must be valid JSON', 400, [
        { field: 'metadata', code: 'INVALID_JSON', message: 'Invalid JSON' },
      ]);
    }

    const dto = plainToInstance(JobMetadataDto, parsed);
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid metadata', 400, errors.map((e) => ({
        field: e.property,
        code: 'INVALID_FIELD',
        message: Object.values(e.constraints ?? {}).join(', '),
      })));
    }
    return dto;
  }

  private validateFiles(files: Express.Multer.File[]) {
    if (!files.length) {
      throw new ApiError('VALIDATION_ERROR', 'At least one file is required', 400, [
        { field: 'files', code: 'FILES_REQUIRED', message: 'Provide one or more files' },
      ]);
    }
    if (files.length > MAX_FILES) {
      throw new ApiError('VALIDATION_ERROR', 'Too many files', 400, [
        { field: 'files', code: 'TOO_MANY_FILES', message: `Maximum ${MAX_FILES} files` },
      ]);
    }

    let total = 0;
    const details: Array<{ field: string; code: string; message: string }> = [];

    files.forEach((file, index) => {
      total += file.size;
      if (file.size > MAX_FILE_SIZE) {
        details.push({
          field: `files[${index}]`,
          code: 'FILE_TOO_LARGE',
          message: 'File exceeds 25 MB limit',
        });
      }
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        details.push({
          field: `files[${index}]`,
          code: 'FILE_TYPE_NOT_ALLOWED',
          message: `MIME type ${file.mimetype} is not allowed`,
        });
      }
    });

    if (total > MAX_TOTAL_SIZE) {
      details.push({
        field: 'files',
        code: 'TOTAL_SIZE_EXCEEDED',
        message: 'Total upload exceeds 100 MB',
      });
    }

    if (details.length) {
      throw new ApiError('VALIDATION_ERROR', 'File validation failed', 400, details);
    }
  }

  async validateFileMagicBytes(files: Express.Multer.File[]) {
    const details: Array<{ field: string; code: string; message: string }> = [];
    for (let i = 0; i < files.length; i++) {
      const mime = this.detectMimeType(files[i].buffer) ?? files[i].mimetype;
      if (!ALLOWED_MIME_TYPES.has(mime)) {
        details.push({
          field: `files[${i}]`,
          code: 'FILE_TYPE_NOT_ALLOWED',
          message: `Detected type ${mime} is not allowed`,
        });
      }
    }
    if (details.length) {
      throw new ApiError('VALIDATION_ERROR', 'File validation failed', 400, details);
    }
  }

  private detectMimeType(buffer: Buffer): string | null {
    if (buffer.slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
    if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return 'image/png';
    }
    if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') {
      return 'image/webp';
    }
    if (buffer.slice(0, 5).toString() === '%PDF-') return 'application/pdf';
    return null;
  }

  private computePayloadHash(metadata: JobMetadataDto, files: Express.Multer.File[]) {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(metadata));
    for (const file of files) {
      hash.update(file.originalname);
      hash.update(file.mimetype);
      hash.update(String(file.size));
      hash.update(file.buffer);
    }
    return hash.digest('hex');
  }

  private toAcceptedResponse(job: Job) {
    return {
      jobId: job.id,
      status: job.status,
      statusUrl: `/v1/jobs/${job.id}`,
    };
  }

  private async toJobResponse(job: Job, partnerId: string) {
    const latestDelivery = await this.deliveriesRepository.findOne({
      where: { jobId: job.id },
      order: { createdAt: 'DESC' },
    });

    const result =
      job.status === JobStatus.COMPLETED
        ? {
            downloadUrl: this.downloadsService.generateSignedUrl(job.id, partnerId),
            expiresAt: new Date(Date.now() + 900_000).toISOString(),
            webhookDelivered:
              latestDelivery?.status === WebhookDeliveryStatus.DELIVERED,
          }
        : null;

    return {
      jobId: job.id,
      status: job.status,
      metadata: job.metadata,
      attachments: (job.attachments ?? []).map((a) => ({
        filename: a.originalFilename,
        mimeType: a.mimeType,
        size: Number(a.sizeBytes),
      })),
      errorMessage: job.errorMessage,
      result,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
