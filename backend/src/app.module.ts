import { DynamicModule, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ConsoleController, HealthController } from './console/console.controller';
import { DownloadsModule } from './downloads/downloads.module';
import { JobAttachment } from './jobs/job-attachment.entity';
import { Job } from './jobs/job.entity';
import { JobsModule } from './jobs/jobs.module';
import { Partner } from './partners/partner.entity';
import { PartnersModule } from './partners/partners.module';
import { PartnersService } from './partners/partners.service';
import { StorageModule } from './storage/storage.module';
import { WebhookDelivery } from './webhooks/webhook-delivery.entity';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({})
export class AppModule implements OnModuleInit {
  constructor(private readonly partnersService: PartnersService) {}

  static forRoot(): DynamicModule {
    const localQueue = process.env.LOCAL_QUEUE === 'true';

    const imports: DynamicModule['imports'] = [
      ConfigModule.forRoot({ isGlobal: true }),
      TypeOrmModule.forRootAsync({
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          type: 'postgres',
          url: config.getOrThrow<string>('DATABASE_URL'),
          entities: [Partner, Job, JobAttachment, WebhookDelivery],
          synchronize: true,
        }),
      }),
      StorageModule,
      AuthModule,
      PartnersModule,
      JobsModule.forRoot(localQueue),
      DownloadsModule,
      WebhooksModule,
    ];

    if (!localQueue) {
      imports.splice(2, 0,
        BullModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            connection: {
              url: config.getOrThrow<string>('REDIS_URL'),
              maxRetriesPerRequest: null,
            },
          }),
        }),
      );
    }

    return {
      module: AppModule,
      imports,
      controllers: [ConsoleController, HealthController],
    };
  }

  async onModuleInit() {
    if (process.env.SEED_DEMO_PARTNER === 'true') {
      await this.partnersService.seedDemoPartner();
    }
  }
}
