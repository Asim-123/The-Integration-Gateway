import { createHmac } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DownloadsService } from '../downloads/downloads.service';
import { JobStatus } from '../jobs/job-status.enum';
import { WebhookDelivery } from './webhook-delivery.entity';
import {
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_RETRY_DELAYS_MS,
  WebhooksService,
} from './webhooks.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  const signingSecret = 'test-webhook-secret';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: getRepositoryToken(WebhookDelivery),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'WEBHOOK_SIGNING_SECRET') return signingSecret;
              throw new Error(`Missing config: ${key}`);
            },
          },
        },
        {
          provide: DownloadsService,
          useValue: {
            generateSignedUrl: jest
              .fn()
              .mockReturnValue('http://localhost:3000/v1/jobs/job-1/report?token=abc'),
          },
        },
      ],
    }).compile();

    service = module.get(WebhooksService);
  });

  describe('retry policy', () => {
    it('defines exponential backoff delays ending in dead-letter', () => {
      expect(WEBHOOK_RETRY_DELAYS_MS).toEqual([
        0, 1000, 2000, 4000, 8000, 16000, 32000,
      ]);
      expect(WEBHOOK_MAX_ATTEMPTS).toBe(7);
    });

    it('returns null delay when attempts are exhausted', () => {
      expect(service.getRetryDelayMs(0)).toBe(0);
      expect(service.getRetryDelayMs(6)).toBe(32000);
      expect(service.getRetryDelayMs(7)).toBeNull();
    });
  });

  describe('signPayload', () => {
    it('produces a verifiable HMAC-SHA256 signature', () => {
      const body = { eventId: 'evt-1', jobId: 'job-1' };
      const timestamp = 1_700_000_000;
      const signature = service.signPayload(body, timestamp);

      const expected = createHmac('sha256', signingSecret)
        .update(`${timestamp}.${JSON.stringify(body)}`)
        .digest('hex');

      expect(signature).toBe(expected);
    });
  });

  describe('buildPayload', () => {
    it('includes eventId and signed download URL for partner deduplication', () => {
      const job = {
        id: 'job-1',
        partnerId: 'partner-1',
        status: JobStatus.COMPLETED,
        metadata: { externalRef: 'ref-42' },
        completedAt: new Date('2026-06-19T12:00:00.000Z'),
      } as never;

      const payload = service.buildPayload(job, 'evt-unique');

      expect(payload).toMatchObject({
        eventId: 'evt-unique',
        event: 'job.completed',
        jobId: 'job-1',
        externalRef: 'ref-42',
        result: {
          downloadUrl: expect.stringContaining('/v1/jobs/job-1/report'),
          expiresAt: expect.any(String),
        },
      });
    });
  });
});
