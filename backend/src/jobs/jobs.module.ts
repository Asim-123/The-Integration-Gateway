import { DynamicModule, Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DownloadsModule } from '../downloads/downloads.module';
import { JobAttachment } from './job-attachment.entity';
import { Job } from './job.entity';
import { JobsController } from './jobs.controller';
import {
  JOB_PROCESSING_QUEUE,
  JobsService,
  WEBHOOK_DELIVERY_QUEUE,
} from './jobs.service';
import { PdfModule } from '../pdf/pdf.module';
import { StorageModule } from '../storage/storage.module';
import { WebhookDelivery } from '../webhooks/webhook-delivery.entity';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { JobProcessingProcessor } from '../queue/job-processing.processor';
import { WebhookDeliveryProcessor } from '../queue/webhook-delivery.processor';
import { QueueDispatcher } from '../queue/queue-dispatcher.service';

@Module({})
export class JobsModule {
  static forRoot(localQueue: boolean): DynamicModule {
    const imports: DynamicModule['imports'] = [
      TypeOrmModule.forFeature([Job, JobAttachment, WebhookDelivery]),
      AuthModule,
      StorageModule,
      PdfModule,
      forwardRef(() => WebhooksModule),
      forwardRef(() => DownloadsModule),
    ];

    const providers: DynamicModule['providers'] = [
      JobsService,
      QueueDispatcher,
      {
        provide: 'QUEUE_WIRING',
        useFactory: (dispatcher: QueueDispatcher, jobs: JobsService) => {
          dispatcher.setJobsService(jobs);
          return true;
        },
        inject: [QueueDispatcher, JobsService],
      },
    ];

    if (!localQueue) {
      imports.push(
        BullModule.registerQueue(
          { name: JOB_PROCESSING_QUEUE },
          { name: WEBHOOK_DELIVERY_QUEUE },
        ),
      );
      providers.push(JobProcessingProcessor, WebhookDeliveryProcessor);
    }

    return {
      module: JobsModule,
      global: true,
      imports,
      controllers: [JobsController],
      providers,
      exports: [JobsService, TypeOrmModule],
    };
  }
}
