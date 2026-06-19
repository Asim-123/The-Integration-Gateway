const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const API_KEY_STORAGE = 'igw_api_key';

export function getApiKey(): string {
  return (
    localStorage.getItem(API_KEY_STORAGE) ??
    import.meta.env.VITE_DEMO_API_KEY ??
    'igw_demo_local_dev_key_12345'
  );
}

export function setApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${getApiKey()}`);
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}/v1${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export interface JobSummary {
  jobId: string;
  status: string;
  metadata: Record<string, unknown>;
  attachments: Array<{ filename: string; mimeType: string; size: number }>;
  errorMessage?: string | null;
  result?: {
    downloadUrl: string;
    expiresAt: string;
    webhookDelivered: boolean;
  } | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ConsoleInfo {
  partnerId: string;
  name: string;
  apiKeyPrefix: string;
  apiKey?: string;
  callbackUrl?: string | null;
}

export const api = {
  getConsoleInfo: () => request<ConsoleInfo>('/console/me'),
  listJobs: () => request<JobSummary[]>('/jobs'),
  getJob: (id: string) => request<JobSummary>(`/jobs/${id}`),
  retryWebhook: (id: string) =>
    request<{ deliveryId: string; eventId: string; status: string }>(
      `/jobs/${id}/webhook/retry`,
      { method: 'POST' },
    ),
  getWebhookInbox: () =>
    fetch(`${API_URL}/v1/demo/webhook-inbox`).then((r) => r.json()),
  submitJob: (metadata: object, files: File[], idempotencyKey?: string) => {
    const form = new FormData();
    form.append('metadata', JSON.stringify(metadata));
    files.forEach((file) => form.append('files', file));
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${getApiKey()}`);
    if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey);
    return fetch(`${API_URL}/v1/jobs`, {
      method: 'POST',
      headers,
      body: form,
    }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message ?? 'Submit failed');
      }
      return body as { jobId: string; status: string; statusUrl: string };
    });
  },
};
