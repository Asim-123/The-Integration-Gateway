import {
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_RETRY_DELAYS_MS,
} from './webhooks.service';

describe('Webhook retry policy', () => {
  it('defines exponential backoff delays ending in dead-letter', () => {
    expect(WEBHOOK_RETRY_DELAYS_MS).toEqual([0, 1000, 2000, 4000, 8000, 16000, 32000]);
    expect(WEBHOOK_MAX_ATTEMPTS).toBe(7);
  });
});
