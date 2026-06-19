const config: Record<string, { bg: string; dot: string; label: string }> = {
  accepted: { bg: 'bg-amber-500/10 text-amber-300 ring-amber-500/20', dot: 'bg-amber-400', label: 'Accepted' },
  processing: { bg: 'bg-blue-500/10 text-blue-300 ring-blue-500/20', dot: 'bg-blue-400 animate-pulse', label: 'Processing' },
  completed: { bg: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20', dot: 'bg-emerald-400', label: 'Completed' },
  failed: { bg: 'bg-red-500/10 text-red-300 ring-red-500/20', dot: 'bg-red-400', label: 'Failed' },
};

export function StatusBadge({ status }: { status: string }) {
  const style = config[status] ?? {
    bg: 'bg-zinc-700/50 text-zinc-300 ring-zinc-600/30',
    dot: 'bg-zinc-400',
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
