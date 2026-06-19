import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui/Card';

type InboxEntry = {
  receivedAt: string;
  headers: Record<string, string>;
  body: unknown;
};

export default function WebhookInbox() {
  const { data: inbox = [], isLoading } = useQuery({
    queryKey: ['webhook-inbox'],
    queryFn: api.getWebhookInbox,
    refetchInterval: 3000,
  });

  return (
    <div>
      <PageHeader
        title="Webhook Inbox"
        description="Inbound deliveries to the demo receiver endpoint. Signed payloads appear here in real time."
      />

      <div className="mb-6 flex items-center gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        <code className="font-mono text-sm text-zinc-400">POST /v1/demo/webhook-receiver</code>
        <span className="ml-auto text-xs text-zinc-600">Latest 20 events</span>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading webhooks..." />
      ) : inbox.length === 0 ? (
        <Card>
          <EmptyState
            title="No webhooks received"
            description="Complete a job to trigger a signed webhook delivery to the demo receiver."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {(inbox as InboxEntry[]).map((entry, i) => (
            <Card key={i} padding="sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {(entry.body as { event?: string })?.event ?? 'webhook.delivery'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(entry.receivedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {entry.headers['x-webhook-signature'] && (
                  <span className="rounded-md bg-zinc-800 px-2 py-1 font-mono text-xs text-amber-400/90">
                    HMAC verified
                  </span>
                )}
              </div>

              {entry.headers['x-webhook-signature'] && (
                <p className="mb-3 truncate font-mono text-xs text-zinc-600">
                  x-webhook-signature: {entry.headers['x-webhook-signature']}
                </p>
              )}

              <pre className="overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-xs leading-relaxed text-zinc-400">
                {JSON.stringify(entry.body, null, 2)}
              </pre>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
