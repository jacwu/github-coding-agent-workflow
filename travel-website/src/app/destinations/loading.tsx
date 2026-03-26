export default function DestinationsLoading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header skeleton */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="h-10 w-72 animate-pulse rounded-xl bg-muted" />
          <div className="h-5 w-56 animate-pulse rounded-lg bg-muted" />
        </div>

        {/* Filter skeleton */}
        <div className="mb-8 rounded-2xl bg-card p-5 shadow-sm space-y-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="h-10 w-32 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        </div>

        {/* Results summary skeleton */}
        <div className="mb-6 h-4 w-40 animate-pulse rounded bg-muted" />

        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-3xl bg-card shadow-sm"
            >
              <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                <div className="flex items-center justify-between pt-1">
                  <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
