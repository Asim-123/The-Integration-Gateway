export function LoadingSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-12 text-sm text-zinc-500">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
      {label}
    </div>
  );
}
