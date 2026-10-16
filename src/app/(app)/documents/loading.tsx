export default function DocumentsLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6" aria-busy="true">
      <div className="h-7 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted/70" />
      <div className="mt-6 space-y-0 overflow-hidden rounded-lg border border-border bg-background">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 last:border-0">
            <div className="min-w-0 flex-1">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-muted/70" />
            </div>
            <div className="size-4 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
