export default function DocumentLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 md:px-6" aria-busy="true">
      <div className="h-5 w-24 animate-pulse rounded bg-muted" />
      <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-10 animate-pulse rounded-lg border border-border bg-background" />
      <div className="rounded-lg border border-border/60 bg-background px-6 py-4 shadow-sm">
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/6 animate-pulse rounded bg-muted/70" />
        </div>
      </div>
    </div>
  );
}
