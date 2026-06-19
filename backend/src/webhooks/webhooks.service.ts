import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac } from 'crypto';
import { Repository } from 'typeorm';
import { Job } from '../jobs/job.entity';
import { DownloadsService } from '../downloads/downloads.service';
import { WebhookDelivery } from './webhook-delivery.entity';
import { WebhookDeliveryStatus } from './webhook-delivery-status.enum';

export const WEBHOOK_RETRY_DELAYS_MS = [0, 1000, 2000, 4000, 8000, 16000, 32000];
export const WEBHOOK_MAX_ATTEMPTS = WEBHOOK_RETRY_DELAYS_MS.length;

@Injectable()
export class WebhooksService {
  private readonly demoInbox: Array<{
    receivedAt: string;
    headers: Record<string, string>;
    body: unknown;
  }> = [];

  constructor(
    @InjectRepository(WebhookDelivery)
    private readonly deliveriesRepository: Repository<WebhookDelivery>,
    private readonly configService: ConfigService,
    private readonly downloadsService: DownloadsService,
  ) {}

  buildPayload(job: Job, eventId: string) {
    return {
      eventId,
      event: 'job.completed',
      jobId: job.id,
      status: job.status,
      externalRef: job.metadata.externalRef,
      completedAt: job.completedAt?.toISOString() ?? null,
      result: {
        downloadUrl: this.downloadsService.generateSignedUrl(job.id, job.partnerId),
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
      },
    };
  }

  signPayload(body: Record<string, unknown>, timestamp: number): string {
    const secret = this.configService.getOrThrow<string>('WEBHOOK_SIGNING_SECRET');
    return createHmac('sha256', secret)
      .update(`${timestamp}.${JSON.stringify(body)}`)
      .digest('hex');
  }

  async createDelivery(job: Job): Promise<WebhookDelivery> {
    const eventId = crypto.randomUUID();
    const payload = this.buildPayload(job, eventId);
    const delivery = this.deliveriesRepository.create({
      jobId: job.id,
      eventId,
      status: WebhookDeliveryStatus.PENDING,
      attemptCount: 0,
      payload,
      nextRetryAt: new Date(),
    });
    return this.deliveriesRepository.save(delivery);
  }

  getRetryDelayMs(attemptCount: number): number | null {
    if (attemptCount >= WEBHOOK_MAX_ATTEMPTS) return null;
    return WEBHOOK_RETRY_DELAYS_MS[attemptCount];
  }

  async recordDemoDelivery(headers: Record<string, string>, body: unknown) {
    this.demoInbox.unshift({
      receivedAt: new Date().toISOString(),
      headers,
      body,
    });
    if (this.demoInbox.length > 20) {
      this.demoInbox.length = 20;
    }
  }

  async getDemoInbox(): Promise<unknown[]> {
    return this.demoInbox;
  }
}
