import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { getDestinationById } from "@/lib/destination-service";
import { formatPriceLevel } from "@/lib/format-utils";

interface DestinationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DestinationDetailPage({
  params,
}: DestinationDetailPageProps) {
  const { id: idParam } = await params;
  const num = Number(idParam);

  if (!Number.isInteger(num) || num < 1) {
    notFound();
  }

  const destination = await getDestinationById(num);

  if (!destination) {
    notFound();
  }

  return (
    <main className="flex-1">
      {/* Hero image */}
      <section className="relative h-[50vh] min-h-[400px] w-full overflow-hidden">
        <Image
          src={destination.image}
          alt={`${destination.name}, ${destination.country}`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-4xl font-bold text-white md:text-5xl">
              {destination.name}
            </h1>
            <p className="mt-2 text-lg text-white/90">{destination.country}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="glass rounded-full px-3 py-1 text-sm font-medium capitalize">
                {destination.category}
              </span>
              <span className="glass rounded-full px-3 py-1 text-sm font-medium">
                ★ {destination.rating.toFixed(1)}
              </span>
              <span className="glass rounded-full px-3 py-1 text-sm font-medium">
                {formatPriceLevel(destination.price_level)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Description */}
        {destination.description && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground">About</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {destination.description}
            </p>
          </section>
        )}

        {/* Metadata panel */}
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destination.region && (
            <div className="rounded-2xl bg-muted/50 p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                Region
              </h3>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {destination.region}
              </p>
            </div>
          )}

          {destination.best_season && (
            <div className="rounded-2xl bg-muted/50 p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                Best Season
              </h3>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {destination.best_season}
              </p>
            </div>
          )}

          <div className="rounded-2xl bg-muted/50 p-6">
            <h3 className="text-sm font-medium text-muted-foreground">
              Price Level
            </h3>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {formatPriceLevel(destination.price_level)} ({destination.price_level}/5)
            </p>
          </div>

          <div className="rounded-2xl bg-muted/50 p-6">
            <h3 className="text-sm font-medium text-muted-foreground">
              Rating
            </h3>
            <p className="mt-1 text-lg font-semibold text-foreground">
              ★ {destination.rating.toFixed(1)} / 5.0
            </p>
          </div>

          <div className="rounded-2xl bg-muted/50 p-6">
            <h3 className="text-sm font-medium text-muted-foreground">
              Category
            </h3>
            <p className="mt-1 text-lg font-semibold capitalize text-foreground">
              {destination.category}
            </p>
          </div>

          {destination.latitude !== null && destination.longitude !== null && (
            <div className="rounded-2xl bg-muted/50 p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                Coordinates
              </h3>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}
              </p>
            </div>
          )}
        </section>

        {/* Back navigation */}
        <div className="mt-12">
          <Link
            href="/destinations"
            className="inline-flex items-center rounded-xl text-primary hover:text-primary/80 transition-colors font-medium"
          >
            ← Back to Destinations
          </Link>
        </div>
      </div>
    </main>
  );
}
