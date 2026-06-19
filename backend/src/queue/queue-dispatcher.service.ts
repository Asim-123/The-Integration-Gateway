import { Injectable, OnModuleInit, Optional, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobsService, JOB_PROCESSING_QUEUE, WEBHOOK_DELIVERY_QUEUE } from '../jobs/jobs.service';

@Injectable()
export class QueueDispatcher implements OnModuleInit {
  private jobsService!: JobsService;

  constructor(
    private readonly configService: ConfigService,
    @Optional() @InjectQueue(JOB_PROCESSING_QUEUE) private readonly jobQueue?: Queue,
    @Optional() @InjectQueue(WEBHOOK_DELIVERY_QUEUE) private readonly webhookQueue?: Queue,
  ) {}

  onModuleInit() {
    // resolved via setter to avoid circular DI at construction time
  }

  setJobsService(service: JobsService) {
    this.jobsService = service;
  }

  isLocalMode(): boolean {
    return this.configService.get<string>('LOCAL_QUEUE', 'false') === 'true';
  }

  async enqueueJobProcessing(jobId: string): Promise<void> {
    if (this.isLocalMode()) {
      setImmediate(() => {
        void this.jobsService.processJob(jobId).catch((err) =>
          console.error('Local job processing failed', err),
        );
      });
      return;
    }
    await this.jobQueue!.add('process-job', { jobId });
  }

  async enqueueWebhookDelivery(
    deliveryId: string,
    delayMs = 0,
  ): Promise<void> {
    if (this.isLocalMode()) {
      setTimeout(() => {
        void this.jobsService.deliverWebhook(deliveryId).catch((err) =>
          console.error('Local webhook delivery failed', err),
        );
      }, delayMs);
      return;
    }
    await this.webhookQueue!.add(
      'deliver-webhook',
      { deliveryId },
      { delay: delayMs },
    );
  }
}
