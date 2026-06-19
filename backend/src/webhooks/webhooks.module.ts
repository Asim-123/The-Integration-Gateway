import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DownloadsModule } from '../downloads/downloads.module';
import { DemoWebhookController } from './demo-webhook.controller';
import { WebhookDelivery } from './webhook-delivery.entity';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookDelivery]),
    forwardRef(() => DownloadsModule),
  ],
  controllers: [DemoWebhookController],
  providers: [WebhooksService],
  exports: [WebhooksService, TypeOrmModule],
})
export class WebhooksModule {}
