import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="font-mono text-sm text-zinc-200">{value}</span>
    </div>
  );
}

export default function JobDetail() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => api.getJob(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'accepted' || status === 'processing' ? 2000 : false;
    },
  });

  const retryWebhook = useMutation({
    mutationFn: () => api.retryWebhook(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job', id] }),
  });

  if (isLoading || !job) {
    return <LoadingSpinner label="Loading job details..." />;
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-zinc-500">
        <Link to="/" className="transition-colors hover:text-zinc-300">
          Jobs
        </Link>
        <span>/</span>
        <span className="font-mono text-zinc-400">{job.jobId.slice(0, 8)}…</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight text-white">
            {job.jobId.slice(0, 8)}…
          </h1>
          <StatusBadge status={job.status} />
        </div>

        {job.result?.downloadUrl && (
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={job.result.downloadUrl} variant="success" target="_blank" rel="noreferrer">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download report
            </ButtonLink>
            <Button
              variant="ghost"
              onClick={() => retryWebhook.mutate()}
              disabled={retryWebhook.isPending}
            >
              {retryWebhook.isPending ? 'Sending…' : 'Re-send webhook'}
            </Button>
          </div>
        )}
      </div>

      {job.errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-300">Processing failed</p>
            <p className="mt-1 text-sm text-red-400/80">{job.errorMessage}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Overview" />
          <div className="space-y-4">
            <InfoRow label="Job ID" value={job.jobId} />
            <InfoRow label="External Ref" value={String(job.metadata.externalRef ?? '—')} />
            <InfoRow label="Type" value={String(job.metadata.type ?? '—')} />
            <InfoRow label="Created" value={new Date(job.createdAt).toLocaleString()} />
            <InfoRow
              label="Completed"
              value={job.completedAt ? new Date(job.completedAt).toLocaleString() : '—'}
            />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Metadata" description="Payload submitted with this job" />
          <pre className="overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-xs leading-relaxed text-zinc-300">
            {JSON.stringify(job.metadata, null, 2)}
          </pre>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Attachments"
          description={`${job.attachments.length} file${job.attachments.length === 1 ? '' : 's'} uploaded`}
        />
        {job.attachments.length === 0 ? (
          <p className="text-sm text-zinc-500">No attachments</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {job.attachments.map((file, i) => (
              <li key={i} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950">
                    <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{file.filename}</p>
                    <p className="text-xs text-zinc-500">{file.mimeType}</p>
                  </div>
                </div>
                <span className="text-sm tabular-nums text-zinc-400">{formatBytes(file.size)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
