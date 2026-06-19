import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardHeader } from '../components/ui/Card';

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [copied, setCopied] = useState(false);

  const { data: consoleInfo } = useQuery({
    queryKey: ['console'],
    queryFn: api.getConsoleInfo,
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: api.listJobs,
    refetchInterval: 3000,
  });

  const stats = {
    total: jobs.length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    processing: jobs.filter((j) => j.status === 'accepted' || j.status === 'processing').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  };

  async function copyApiKey() {
    if (!consoleInfo?.apiKey) return;
    await navigator.clipboard.writeText(consoleInfo.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <PageHeader
        title="Jobs"
        description="Monitor submitted integration jobs, track processing status, and access reports."
        action={
          <Link
            to="/playground"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New job
          </Link>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total} accent="text-white" />
        <StatCard label="Completed" value={stats.completed} accent="text-emerald-400" />
        <StatCard label="In progress" value={stats.processing} accent="text-blue-400" />
        <StatCard label="Failed" value={stats.failed} accent="text-red-400" />
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader
            title="API credentials"
            description={`Partner: ${consoleInfo?.name ?? 'Loading...'}`}
            action={
              <button
                onClick={copyApiKey}
                disabled={!consoleInfo?.apiKey}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {copied ? 'Copied!' : 'Copy key'}
              </button>
            }
          />
          <div className="flex items-center gap-3">
            <span className="shrink-0 rounded-md bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-400">
              {consoleInfo?.apiKeyPrefix ?? '--------'}...
            </span>
            <code className="flex-1 break-all rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 font-mono text-sm text-emerald-400/90">
              {consoleInfo?.apiKey ?? 'Configure DEMO_API_KEY in backend .env'}
            </code>
          </div>
        </Card>

        <Card padding="sm">
          <CardHeader
            title="Recent jobs"
            description="Auto-refreshes every 3 seconds"
            action={
              <span className="text-xs text-zinc-600">{jobs.length} total</span>
            }
          />

          {isLoading ? (
            <LoadingSpinner label="Loading jobs..." />
          ) : jobs.length === 0 ? (
            <EmptyState
              title="No jobs yet"
              description="Submit your first job from the Playground to see it appear here."
              action={
                <Link
                  to="/playground"
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
                >
                  Open Playground
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3">Job ID</th>
                    <th className="px-4 py-3">External Ref</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {jobs.map((job) => (
                    <tr key={job.jobId} className="transition-colors hover:bg-zinc-800/30">
                      <td className="px-4 py-3.5">
                        <Link
                          className="font-mono text-sm text-blue-400 transition-colors hover:text-blue-300"
                          to={`/jobs/${job.jobId}`}
                        >
                          {job.jobId.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-300">
                        {String(job.metadata.externalRef ?? '—')}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3.5 text-zinc-400">
                        {new Date(job.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-400">
                        {job.completedAt ? new Date(job.completedAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
