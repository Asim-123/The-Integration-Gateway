jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

import { JobsService } from './jobs.service';
import { WebhookDeliveryStatus } from '../webhooks/webhook-delivery-status.enum';
import { WEBHOOK_RETRY_DELAYS_MS } from '../webhooks/webhooks.service';

describe('JobsService webhook delivery', () => {
  let service: JobsService;
  let deliveriesRepository: { findOne: jest.Mock; save: jest.Mock };
  let webhooksService: { signPayload: jest.Mock; getRetryDelayMs: jest.Mock };
  let queueDispatcher: { enqueueWebhookDelivery: jest.Mock };
  let fetchMock: jest.Mock;

  const baseDelivery = {
    id: 'delivery-1',
    eventId: 'event-1',
    attemptCount: 0,
    status: WebhookDeliveryStatus.PENDING,
    payload: { eventId: 'event-1', jobId: 'job-1' },
    job: { callbackUrl: 'http://partner.example/webhook' },
  };

  beforeEach(() => {
    jest.useFakeTimers();
    deliveriesRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((delivery) => Promise.resolve(delivery)),
    };
    webhooksService = {
      signPayload: jest.fn().mockReturnValue('test-signature'),
      getRetryDelayMs: jest.fn(),
    };
    queueDispatcher = {
      enqueueWebhookDelivery: jest.fn().mockResolvedValue(undefined),
    };

    service = new JobsService(
      {} as never,
      {} as never,
      deliveriesRepository as never,
      queueDispatcher as never,
      {} as never,
      {} as never,
      {} as never,
      webhooksService as never,
    );

    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('marks delivery as delivered on HTTP 2xx', async () => {
    deliveriesRepository.findOne.mockResolvedValue({ ...baseDelivery });
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await service.deliverWebhook('delivery-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://partner.example/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Webhook-Event-Id': 'event-1',
          'X-Webhook-Signature': expect.stringMatching(/^t=\d+,v1=test-signature$/),
        }),
      }),
    );
    expect(deliveriesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: WebhookDeliveryStatus.DELIVERED,
        attemptCount: 1,
        lastResponseCode: 200,
        lastError: null,
      }),
    );
    expect(queueDispatcher.enqueueWebhookDelivery).not.toHaveBeenCalled();
  });

  it('schedules retry with backoff on HTTP 5xx', async () => {
    deliveriesRepository.findOne.mockResolvedValue({ ...baseDelivery });
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    webhooksService.getRetryDelayMs.mockReturnValue(WEBHOOK_RETRY_DELAYS_MS[1]);

    await service.deliverWebhook('delivery-1');

    expect(deliveriesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: WebhookDeliveryStatus.FAILED,
        attemptCount: 1,
        lastError: 'HTTP 503',
        nextRetryAt: expect.any(Date),
      }),
    );
    expect(queueDispatcher.enqueueWebhookDelivery).toHaveBeenCalledWith(
      'delivery-1',
      WEBHOOK_RETRY_DELAYS_MS[1],
    );
  });

  it('moves to dead letter after max attempts', async () => {
    deliveriesRepository.findOne.mockResolvedValue({
      ...baseDelivery,
      attemptCount: 6,
    });
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    webhooksService.getRetryDelayMs.mockReturnValue(null);

    await service.deliverWebhook('delivery-1');

    expect(deliveriesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: WebhookDeliveryStatus.DEAD_LETTER,
        attemptCount: 7,
        nextRetryAt: null,
      }),
    );
    expect(queueDispatcher.enqueueWebhookDelivery).not.toHaveBeenCalled();
  });

  it('skips already-delivered webhooks', async () => {
    deliveriesRepository.findOne.mockResolvedValue({
      ...baseDelivery,
      status: WebhookDeliveryStatus.DELIVERED,
    });

    await service.deliverWebhook('delivery-1');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(deliveriesRepository.save).not.toHaveBeenCalled();
  });

  it('retries on network failure', async () => {
    deliveriesRepository.findOne.mockResolvedValue({ ...baseDelivery });
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    webhooksService.getRetryDelayMs.mockReturnValue(1000);

    await service.deliverWebhook('delivery-1');

    expect(deliveriesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: WebhookDeliveryStatus.FAILED,
        attemptCount: 1,
        lastError: 'ECONNREFUSED',
        lastResponseCode: null,
      }),
    );
    expect(queueDispatcher.enqueueWebhookDelivery).toHaveBeenCalledWith(
      'delivery-1',
      1000,
    );
  });
});
