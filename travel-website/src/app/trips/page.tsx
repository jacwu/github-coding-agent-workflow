import { redirect } from "next/navigation";
import Link from "next/link";
import { MapPin, Calendar, Clock } from "lucide-react";

import { auth } from "@/lib/auth";
import { parseUserId } from "@/lib/trips";
import { getUserTrips } from "@/lib/trip-service";
import CreateTripForm from "@/components/CreateTripForm";

export default async function TripsPage() {
  const session = await auth();
  const userId = parseUserId(session);

  if (userId === null) {
    redirect("/login?callbackUrl=/trips");
  }

  const { data: trips } = getUserTrips(userId);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            My Trips
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Plan and organize your travel adventures
          </p>
        </div>

        {/* Create trip section */}
        <div className="mb-10">
          <CreateTripForm />
        </div>

        {/* Trip list or empty state */}
        {trips.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                className="group block rounded-2xl bg-card p-6 shadow-sm transition-shadow hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors">
                    {trip.title}
                  </h2>
                  <StatusBadge status={trip.status} />
                </div>

                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {trip.start_date && trip.end_date
                        ? `${trip.start_date} → ${trip.end_date}`
                        : trip.start_date
                          ? `From ${trip.start_date}`
                          : trip.end_date
                            ? `Until ${trip.end_date}`
                            : "No dates set"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {trip.stop_count} stop{trip.stop_count !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Updated {trip.updated_at}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-20 text-center shadow-sm">
            <MapPin className="h-12 w-12 text-muted-foreground/40" />
            <h2 className="mt-4 text-xl font-semibold text-card-foreground">
              No trips yet
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Create your first travel plan above to start organizing your next adventure.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    planned: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colorMap[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
}
