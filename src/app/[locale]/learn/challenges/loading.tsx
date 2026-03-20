export default function ChallengesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      {/* Header skeleton */}
      <div className="max-w-2xl">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mt-3 h-5 w-80 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Tabs skeleton */}
      <div className="mt-8 flex gap-1 border-b pb-px">
        {[64, 72, 88].map((w) => (
          <div key={w} className="h-9 animate-pulse rounded-md bg-muted" style={{ width: w }} />
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="mt-6 space-y-4">
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-md bg-muted" style={{ width: 72 + (i % 3) * 24 }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>

      {/* Results count skeleton */}
      <div className="mt-6 h-4 w-48 animate-pulse rounded bg-muted" />

      {/* Challenge grid skeleton */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card/50 p-5">
            <div className="flex items-start justify-between">
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="mt-2 space-y-1.5">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
