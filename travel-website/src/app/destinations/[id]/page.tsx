import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Star, DollarSign, Calendar, Tag, Globe, Compass } from "lucide-react";

import { getDestinationById } from "@/lib/destination-service";

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  if (!Number.isInteger(id) || id < 1) {
    notFound();
  }

  const destination = getDestinationById(id);

  if (!destination) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <Link
          href="/destinations"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to destinations
        </Link>

        {/* Hero image */}
        <div className="relative mt-4 w-full overflow-hidden rounded-2xl aspect-[21/9]">
          <Image
            src={destination.image}
            alt={destination.name}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1280px) 100vw, 1280px"
          />
        </div>

        {/* Content layout */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & metadata */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {destination.name}
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">
                {destination.country}
                {destination.region ? ` · ${destination.region}` : ""}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground capitalize">
                  <Tag className="h-3.5 w-3.5" />
                  {destination.category}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {destination.rating.toFixed(1)}
                </span>
                <span className="inline-flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <DollarSign
                      key={i}
                      className={`h-4 w-4 ${
                        i < destination.price_level
                          ? "text-primary"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </span>
              </div>
            </div>

            {/* Description */}
            {destination.description && (
              <div>
                <h2 className="text-xl font-semibold text-foreground">About</h2>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {destination.description}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar — travel facts */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-card p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold text-card-foreground">
                Travel Facts
              </h2>

              <div className="space-y-4">
                <FactItem
                  icon={<Globe className="h-4 w-4 text-primary" />}
                  label="Region"
                  value={destination.region ?? "—"}
                />
                <FactItem
                  icon={<Tag className="h-4 w-4 text-primary" />}
                  label="Category"
                  value={destination.category}
                  capitalize
                />
                <FactItem
                  icon={<Calendar className="h-4 w-4 text-primary" />}
                  label="Best Season"
                  value={destination.best_season ?? "—"}
                />
                <FactItem
                  icon={<DollarSign className="h-4 w-4 text-primary" />}
                  label="Price Level"
                  value={"$".repeat(destination.price_level)}
                />
                <FactItem
                  icon={<Star className="h-4 w-4 text-primary" />}
                  label="Rating"
                  value={`${destination.rating.toFixed(1)} / 5`}
                />
                {destination.latitude !== null &&
                  destination.longitude !== null && (
                    <FactItem
                      icon={<Compass className="h-4 w-4 text-primary" />}
                      label="Coordinates"
                      value={`${destination.latitude.toFixed(2)}°, ${destination.longitude.toFixed(2)}°`}
                    />
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function FactItem({
  icon,
  label,
  value,
  capitalize = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={`text-sm font-medium text-card-foreground ${
            capitalize ? "capitalize" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
