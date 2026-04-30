export default function TripsLoading() {
  return (
    <main className="flex-1">
      <section className="bg-muted/50 px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="h-10 w-48 mx-auto rounded-xl bg-muted animate-pulse" />
          <div className="mt-4 h-6 w-64 mx-auto rounded-lg bg-muted animate-pulse" />
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl bg-muted animate-pulse"
            />
          ))}
        </div>
      </section>
    </main>
  );
}
