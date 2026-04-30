import Link from "next/link";

export default function TripNotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Trip Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          The trip you&apos;re looking for doesn&apos;t exist or you don&apos;t
          have access to it.
        </p>
        <Link
          href="/trips"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Back to My Trips
        </Link>
      </div>
    </main>
  );
}
