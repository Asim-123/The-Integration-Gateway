import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';

const defaultMetadata = {
  callbackUrl: 'http://localhost:3000/v1/demo/webhook-receiver',
  externalRef: `demo-${Date.now()}`,
  type: 'verification',
};

export default function Playground() {
  const [metadataText, setMetadataText] = useState(
    JSON.stringify(defaultMetadata, null, 2),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const metadata = JSON.parse(metadataText);
      return api.submitJob(metadata, files, `playground-${Date.now()}`);
    },
    onSuccess: (data) => {
      setJobId(data.jobId);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'accepted' || status === 'processing' ? 1500 : false;
    },
  });

  return (
    <div>
      <PageHeader
        title="API Playground"
        description="Test job submissions against the live API. Upload files, configure metadata, and watch processing in real time."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader
              title="Request payload"
              description="POST /v1/jobs — multipart form with metadata JSON and file attachments"
            />

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Metadata (JSON)
                </label>
                <textarea
                  className="h-48 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-sm text-zinc-300 outline-none transition-colors focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
                  value={metadataText}
                  onChange={(e) => setMetadataText(e.target.value)}
                  spellCheck={false}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Attachments
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-10 transition-colors hover:border-zinc-700 hover:bg-zinc-900/40">
                  <svg className="mb-3 h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm font-medium text-zinc-400">
                    {files.length ? `${files.length} file(s) selected` : 'Click to upload files'}
                  </span>
                  <span className="mt-1 text-xs text-zinc-600">PDF, JPEG, PNG, WebP — max 25 MB each</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                    className="hidden"
                  />
                </label>
                {files.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {files.map((f, i) => (
                      <li key={i} className="text-xs text-zinc-500">
                        {f.name} ({(f.size / 1024).toFixed(1)} KB)
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button
                onClick={() => submit.mutate()}
                disabled={submit.isPending || !files.length}
                className="w-full sm:w-auto"
              >
                {submit.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Submitting…
                  </>
                ) : (
                  'Submit job'
                )}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader title="Response" description="Live job status after submission" />

            {!jobId || !job ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
                  <svg className="h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-sm text-zinc-500">Submit a job to see the response here</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Status</span>
                  <StatusBadge status={job.status} />
                </div>

                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Job ID</span>
                  <Link
                    className="mt-1 block break-all font-mono text-sm text-blue-400 transition-colors hover:text-blue-300"
                    to={`/jobs/${jobId}`}
                  >
                    {jobId}
                  </Link>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">HTTP 202 Accepted</p>
                  <p className="mt-2 text-sm text-zinc-400">
                    Job queued for async processing. Webhook will fire on completion.
                  </p>
                </div>

                {job.result?.downloadUrl && (
                  <ButtonLink href={job.result.downloadUrl} variant="success" target="_blank" rel="noreferrer" className="w-full">
                    Download report
                  </ButtonLink>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
