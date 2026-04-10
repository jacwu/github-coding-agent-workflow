import Link from "next/link";

export default function DestinationNotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">
          Destination Not Found
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          The destination you&apos;re looking for doesn&apos;t exist or may have
          been removed.
        </p>
        <Link
          href="/destinations"
          className="mt-8 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          ← Back to Destinations
        </Link>
      </div>
    </main>
  );
}
