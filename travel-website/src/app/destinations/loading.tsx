export default function DestinationsLoading() {
  return (
    <main className="flex-1">
      {/* Hero skeleton */}
      <section className="bg-muted/50 px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto h-10 w-72 animate-pulse rounded-xl bg-muted" />
          <div className="mx-auto mt-4 h-6 w-96 max-w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </section>

      {/* Filter skeleton */}
      <section className="mx-auto max-w-7xl px-4 -mt-8">
        <div className="h-36 animate-pulse rounded-3xl bg-muted" />
      </section>

      {/* Grid skeleton */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-3xl overflow-hidden">
              <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                <div className="flex justify-between">
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-10 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
