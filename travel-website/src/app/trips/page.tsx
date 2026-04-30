import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { buildAuthPageHref } from "@/lib/auth-utils";
import { listTripsForUser } from "@/lib/trip-service";
import TripCreateForm from "@/components/TripCreateForm";
import TripSummaryCard from "@/components/TripSummaryCard";

export default async function TripsPage() {
  const session = (await auth()) as Session | null;

  if (!session?.user?.id) {
    redirect(buildAuthPageHref("/login", "/trips"));
  }

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId) || userId < 1) {
    redirect(buildAuthPageHref("/login", "/trips"));
  }

  const trips = await listTripsForUser(userId);

  return (
    <main className="flex-1">
      {/* Hero / header */}
      <section className="bg-muted/50 px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            My Trips
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Plan and manage your travel adventures. Your saved trips are always
            just a click away.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        {/* Create trip form */}
        <TripCreateForm />

        {/* Trip list or empty state */}
        {trips.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {trips.map((trip) => (
              <TripSummaryCard key={trip.id} {...trip} />
            ))}
          </div>
        ) : (
          <div className="mt-10 py-16 text-center">
            <p className="text-lg text-muted-foreground">
              You haven&apos;t created any trips yet.
            </p>
            <Link
              href="/destinations"
              className="mt-4 inline-block rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Browse Destinations for Inspiration
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
