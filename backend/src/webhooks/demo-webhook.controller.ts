import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@Controller('demo')
export class DemoWebhookController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('webhook-receiver')
  async receiveWebhook(
    @Req() req: Request,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    await this.webhooksService.recordDemoDelivery(
      {
        'x-webhook-signature': headers['x-webhook-signature'] ?? '',
        'x-webhook-event-id': headers['x-webhook-event-id'] ?? '',
      },
      body,
    );
    return { received: true };
  }

  @Get('webhook-inbox')
  async getInbox() {
    return this.webhooksService.getDemoInbox();
  }
}
