import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job as BullJob } from 'bullmq';
import { JobsService, WEBHOOK_DELIVERY_QUEUE } from '../jobs/jobs.service';

@Processor(WEBHOOK_DELIVERY_QUEUE)
export class WebhookDeliveryProcessor extends WorkerHost {
  constructor(private readonly jobsService: JobsService) {
    super();
  }

  async process(job: BullJob<{ deliveryId: string }>) {
    await this.jobsService.deliverWebhook(job.data.deliveryId);
  }
}
