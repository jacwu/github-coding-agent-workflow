import { eq, and, sql, asc, desc } from "drizzle-orm";

import { db } from "@/db";
import { trips, tripStops, destinations } from "@/db/schema";
import type { Trip, TripStop, Destination } from "@/db/schema";
import {
  type TripCreateBody,
  type TripUpdateBody,
  type StopCreateBody,
  type StopReorderItem,
  type TripListItem,
  type TripDetail,
  serializeTripListItem,
  serializeTripStop,
  serializeTripDetail,
} from "@/lib/trips";

// ─── Trip queries ───────────────────────────────────────────────────────────

export function getUserTrips(userId: number): { data: TripListItem[] } {
  const rows = db
    .select({
      trip: trips,
      stopCount: sql<number>`COUNT(${tripStops.id})`.as("stop_count"),
    })
    .from(trips)
    .leftJoin(tripStops, eq(trips.id, tripStops.tripId))
    .where(eq(trips.userId, userId))
    .groupBy(trips.id)
    .orderBy(desc(trips.updatedAt), desc(trips.id))
    .all();

  return {
    data: rows.map((row) => serializeTripListItem(row.trip, row.stopCount)),
  };
}

export function getUserTripById(userId: number, tripId: number): Trip | null {
  const row = db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
    .get();

  return row ?? null;
}

export function getTripDetail(userId: number, tripId: number): TripDetail | null {
  const trip = getUserTripById(userId, tripId);
  if (!trip) return null;

  const stopRows = db
    .select({
      stop: tripStops,
      destination: {
        name: destinations.name,
        country: destinations.country,
        image: destinations.image,
      },
    })
    .from(tripStops)
    .innerJoin(destinations, eq(tripStops.destinationId, destinations.id))
    .where(eq(tripStops.tripId, tripId))
    .orderBy(asc(tripStops.sortOrder), asc(tripStops.id))
    .all();

  const serializedStops = stopRows.map((row) =>
    serializeTripStop(row.stop, row.destination),
  );

  return serializeTripDetail(trip, serializedStops);
}

function currentTimestamp(): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
}

export function createTrip(userId: number, body: TripCreateBody): TripDetail {
  const now = currentTimestamp();
  const result = db
    .insert(trips)
    .values({
      userId,
      title: body.title,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  return serializeTripDetail(result, []);
}

export function updateTrip(
  userId: number,
  tripId: number,
  body: TripUpdateBody,
): TripDetail | null {
  const trip = getUserTripById(userId, tripId);
  if (!trip) return null;

  const now = currentTimestamp();
  db.update(trips)
    .set({
      title: body.title,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status,
      updatedAt: now,
    })
    .where(eq(trips.id, tripId))
    .run();

  return getTripDetail(userId, tripId);
}

export function deleteTrip(userId: number, tripId: number): boolean {
  const trip = getUserTripById(userId, tripId);
  if (!trip) return false;

  db.delete(trips).where(eq(trips.id, tripId)).run();
  return true;
}

// ─── Stop queries ───────────────────────────────────────────────────────────

export function getDestinationById(id: number): Pick<Destination, "id" | "name" | "country" | "image"> | null {
  const row = db
    .select({
      id: destinations.id,
      name: destinations.name,
      country: destinations.country,
      image: destinations.image,
    })
    .from(destinations)
    .where(eq(destinations.id, id))
    .get();

  return row ?? null;
}

export function addStop(
  userId: number,
  tripId: number,
  body: StopCreateBody,
): TripDetail | "trip_not_found" | "destination_not_found" {
  const trip = getUserTripById(userId, tripId);
  if (!trip) return "trip_not_found";

  // Verify destination exists
  const destination = getDestinationById(body.destinationId);
  if (!destination) return "destination_not_found";

  // Compute next sort_order
  const maxResult = db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${tripStops.sortOrder}), 0)` })
    .from(tripStops)
    .where(eq(tripStops.tripId, tripId))
    .get();

  const nextOrder = (maxResult?.maxOrder ?? 0) + 1;

  db.insert(tripStops)
    .values({
      tripId,
      destinationId: body.destinationId,
      sortOrder: nextOrder,
      arrivalDate: body.arrivalDate,
      departureDate: body.departureDate,
      notes: body.notes,
    })
    .run();

  // Update trip updatedAt
  const now = currentTimestamp();
  db.update(trips).set({ updatedAt: now }).where(eq(trips.id, tripId)).run();

  return getTripDetail(userId, tripId)!;
}

export function getStopsByTripId(tripId: number): TripStop[] {
  return db
    .select()
    .from(tripStops)
    .where(eq(tripStops.tripId, tripId))
    .orderBy(asc(tripStops.sortOrder), asc(tripStops.id))
    .all();
}

export function reorderStops(
  userId: number,
  tripId: number,
  items: StopReorderItem[],
): TripDetail | string | null {
  const trip = getUserTripById(userId, tripId);
  if (!trip) return null;

  // Get all current stops for this trip
  const currentStops = getStopsByTripId(tripId);

  // Validate: count must match
  if (items.length !== currentStops.length) {
    return "stop_count_mismatch";
  }

  // Validate: all referenced stop ids must belong to this trip
  const tripStopIds = new Set(currentStops.map((s) => s.id));
  for (const item of items) {
    if (!tripStopIds.has(item.id)) {
      return "invalid_stop_id";
    }
  }

  // Two-phase reorder inside a transaction
  db.transaction((tx) => {
    // Phase 1: move all to temporary sort_order (offset by 1000)
    for (let i = 0; i < items.length; i++) {
      tx.update(tripStops)
        .set({ sortOrder: 1000 + i })
        .where(and(eq(tripStops.id, items[i].id), eq(tripStops.tripId, tripId)))
        .run();
    }

    // Phase 2: write final sort_order values
    for (const item of items) {
      tx.update(tripStops)
        .set({ sortOrder: item.sort_order })
        .where(and(eq(tripStops.id, item.id), eq(tripStops.tripId, tripId)))
        .run();
    }

    // Update trip updatedAt
    const now = currentTimestamp();
    tx.update(trips).set({ updatedAt: now }).where(eq(trips.id, tripId)).run();
  });

  return getTripDetail(userId, tripId);
}

export function deleteStop(
  userId: number,
  tripId: number,
  stopId: number,
): boolean | string {
  const trip = getUserTripById(userId, tripId);
  if (!trip) return "trip_not_found";

  // Verify the stop belongs to this trip
  const stop = db
    .select()
    .from(tripStops)
    .where(and(eq(tripStops.id, stopId), eq(tripStops.tripId, tripId)))
    .get();

  if (!stop) return "stop_not_found";

  db.transaction((tx) => {
    // Delete the stop
    tx.delete(tripStops)
      .where(and(eq(tripStops.id, stopId), eq(tripStops.tripId, tripId)))
      .run();

    // Renumber remaining stops to keep contiguous order starting at 1
    const remaining = tx
      .select()
      .from(tripStops)
      .where(eq(tripStops.tripId, tripId))
      .orderBy(asc(tripStops.sortOrder), asc(tripStops.id))
      .all();

    for (let i = 0; i < remaining.length; i++) {
      tx.update(tripStops)
        .set({ sortOrder: i + 1 })
        .where(eq(tripStops.id, remaining[i].id))
        .run();
    }

    // Update trip updatedAt
    const now = currentTimestamp();
    tx.update(trips).set({ updatedAt: now }).where(eq(trips.id, tripId)).run();
  });

  return true;
}
