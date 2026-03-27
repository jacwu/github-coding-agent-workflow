import { redirect, notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { parseUserId, parseIdParam } from "@/lib/trips";
import { getTripDetail } from "@/lib/trip-service";
import { getDestinationOptions } from "@/lib/destination-service";
import TripEditor from "@/components/TripEditor";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = parseUserId(session);
  const { id: idParam } = await params;

  if (userId === null) {
    redirect(`/login?callbackUrl=/trips/${idParam}`);
  }

  const tripId = parseIdParam(idParam);
  if (tripId === null) {
    notFound();
  }

  const trip = getTripDetail(userId, tripId);
  if (!trip) {
    notFound();
  }

  const destinationOptions = getDestinationOptions();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <TripEditor trip={trip} destinationOptions={destinationOptions} />
      </div>
    </main>
  );
}
