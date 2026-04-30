import type { Session } from "next-auth";
import { redirect, notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildAuthPageHref } from "@/lib/auth-utils";
import { getTripByIdForUser } from "@/lib/trip-service";
import { listDestinations } from "@/lib/destination-service";
import TripEditor from "@/components/TripEditor";

interface TripDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const session = (await auth()) as Session | null;
  const { id: idParam } = await params;

  const requestedPath = `/trips/${idParam}`;

  if (!session?.user?.id) {
    redirect(buildAuthPageHref("/login", requestedPath));
  }

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId) || userId < 1) {
    redirect(buildAuthPageHref("/login", requestedPath));
  }

  const tripId = Number(idParam);
  if (!Number.isInteger(tripId) || tripId < 1) {
    notFound();
  }

  const trip = await getTripByIdForUser(tripId, userId);
  if (!trip) {
    notFound();
  }

  const destResult = await listDestinations({ limit: 100 });
  const destinationOptions = destResult.data.map((d) => ({
    id: d.id,
    name: d.name,
    country: d.country,
    category: d.category,
  }));

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-5xl px-4 py-8">
        <TripEditor
          initialTrip={trip}
          destinationOptions={destinationOptions}
        />
      </section>
    </main>
  );
}
