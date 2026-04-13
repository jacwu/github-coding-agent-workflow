import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db as defaultDb } from "@/db/index";
import { destinations, trips, tripStops } from "@/db/schema";

type Database = typeof defaultDb;

const IMAGE_PATH_PREFIX = "/images/destinations/";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreateTripInput {
  title: string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface UpdateTripInput {
  title?: string;
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
}

export interface AddStopInput {
  destination_id: number;
  arrival_date?: string | null;
  departure_date?: string | null;
  notes?: string | null;
}

export interface ReorderStopItem {
  id: number;
  sort_order: number;
}

export interface ReorderInput {
  stops: ReorderStopItem[];
}

// ---------------------------------------------------------------------------
// DTO types
// ---------------------------------------------------------------------------

interface StopDestinationDto {
  id: number;
  name: string;
  country: string;
  category: string;
  image: string;
}

interface TripStopDto {
  id: number;
  destination_id: number;
  sort_order: number;
  arrival_date: string | null;
  departure_date: string | null;
  notes: string | null;
  destination: StopDestinationDto;
}

export interface TripSummaryDto {
  id: number;
  title: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TripDetailDto extends TripSummaryDto {
  stops: TripStopDto[];
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class DestinationNotFoundError extends Error {
  constructor(destinationId: number) {
    super(`Destination ${destinationId} not found`);
    this.name = "DestinationNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toImagePath(filename: string): string {
  return `${IMAGE_PATH_PREFIX}${filename}`;
}

function toSummaryDto(row: typeof trips.$inferSelect): TripSummaryDto {
  return {
    id: row.id,
    title: row.title,
    start_date: row.startDate,
    end_date: row.endDate,
    status: row.status,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function nowTimestamp(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

async function fetchTripDetail(
  tripId: number,
  userId: number,
  database: Database,
): Promise<TripDetailDto | null> {
  const [tripRow] = await database
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
    .limit(1);

  if (!tripRow) {
    return null;
  }

  const stopRows = await database
    .select({
      id: tripStops.id,
      destinationId: tripStops.destinationId,
      sortOrder: tripStops.sortOrder,
      arrivalDate: tripStops.arrivalDate,
      departureDate: tripStops.departureDate,
      notes: tripStops.notes,
      destId: destinations.id,
      destName: destinations.name,
      destCountry: destinations.country,
      destCategory: destinations.category,
      destImage: destinations.image,
    })
    .from(tripStops)
    .innerJoin(destinations, eq(tripStops.destinationId, destinations.id))
    .where(eq(tripStops.tripId, tripId))
    .orderBy(asc(tripStops.sortOrder), asc(tripStops.id));

  const stopsDto: TripStopDto[] = stopRows.map((s) => ({
    id: s.id,
    destination_id: s.destinationId,
    sort_order: s.sortOrder,
    arrival_date: s.arrivalDate,
    departure_date: s.departureDate,
    notes: s.notes,
    destination: {
      id: s.destId,
      name: s.destName,
      country: s.destCountry,
      category: s.destCategory,
      image: toImagePath(s.destImage),
    },
  }));

  return {
    ...toSummaryDto(tripRow),
    stops: stopsDto,
  };
}

async function touchUpdatedAt(
  tripId: number,
  database: Database,
): Promise<void> {
  await database
    .update(trips)
    .set({ updatedAt: nowTimestamp() })
    .where(eq(trips.id, tripId));
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function listTripsForUser(
  userId: number,
  database: Database = defaultDb,
): Promise<TripSummaryDto[]> {
  const rows = await database
    .select()
    .from(trips)
    .where(eq(trips.userId, userId))
    .orderBy(asc(trips.id));

  return rows.map(toSummaryDto);
}

export async function createTrip(
  input: CreateTripInput,
  userId: number,
  database: Database = defaultDb,
): Promise<TripDetailDto> {
  const now = nowTimestamp();

  const [inserted] = await database
    .insert(trips)
    .values({
      userId,
      title: input.title,
      startDate: input.start_date ?? null,
      endDate: input.end_date ?? null,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return {
    ...toSummaryDto(inserted),
    stops: [],
  };
}

export async function getTripByIdForUser(
  tripId: number,
  userId: number,
  database: Database = defaultDb,
): Promise<TripDetailDto | null> {
  return fetchTripDetail(tripId, userId, database);
}

export async function updateTripForUser(
  tripId: number,
  userId: number,
  input: UpdateTripInput,
  database: Database = defaultDb,
): Promise<TripDetailDto | null> {
  // Verify ownership first
  const [existing] = await database
    .select({ id: trips.id })
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
    .limit(1);

  if (!existing) {
    return null;
  }

  const updateFields: Record<string, unknown> = {
    updatedAt: nowTimestamp(),
  };

  if (input.title !== undefined) {
    updateFields.title = input.title;
  }
  if (input.start_date !== undefined) {
    updateFields.startDate = input.start_date;
  }
  if (input.end_date !== undefined) {
    updateFields.endDate = input.end_date;
  }
  if (input.status !== undefined) {
    updateFields.status = input.status;
  }

  await database
    .update(trips)
    .set(updateFields)
    .where(eq(trips.id, tripId));

  return fetchTripDetail(tripId, userId, database);
}

export async function deleteTripForUser(
  tripId: number,
  userId: number,
  database: Database = defaultDb,
): Promise<boolean> {
  const result = await database
    .delete(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
    .returning({ id: trips.id });

  return result.length > 0;
}

export async function addTripStop(
  tripId: number,
  userId: number,
  input: AddStopInput,
  database: Database = defaultDb,
): Promise<TripDetailDto | null> {
  // Verify trip ownership
  const [tripRow] = await database
    .select({ id: trips.id })
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
    .limit(1);

  if (!tripRow) {
    return null;
  }

  // Verify destination exists
  const [destRow] = await database
    .select({ id: destinations.id })
    .from(destinations)
    .where(eq(destinations.id, input.destination_id))
    .limit(1);

  if (!destRow) {
    throw new DestinationNotFoundError(input.destination_id);
  }

  // Get current max sort_order
  const [maxResult] = await database
    .select({ maxOrder: sql<number>`COALESCE(MAX(${tripStops.sortOrder}), 0)` })
    .from(tripStops)
    .where(eq(tripStops.tripId, tripId));

  const nextOrder = (maxResult?.maxOrder ?? 0) + 1;

  await database.insert(tripStops).values({
    tripId,
    destinationId: input.destination_id,
    sortOrder: nextOrder,
    arrivalDate: input.arrival_date ?? null,
    departureDate: input.departure_date ?? null,
    notes: input.notes ?? null,
  });

  await touchUpdatedAt(tripId, database);

  return fetchTripDetail(tripId, userId, database);
}

export async function reorderTripStops(
  tripId: number,
  userId: number,
  input: ReorderInput,
  database: Database = defaultDb,
): Promise<TripDetailDto | null> {
  // Verify trip ownership
  const [tripRow] = await database
    .select({ id: trips.id })
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
    .limit(1);

  if (!tripRow) {
    return null;
  }

  // Get all existing stops for this trip
  const existingStops = await database
    .select({ id: tripStops.id })
    .from(tripStops)
    .where(eq(tripStops.tripId, tripId));

  const existingIds = new Set(existingStops.map((s) => s.id));
  const inputIds = new Set(input.stops.map((s) => s.id));

  // All provided stops must belong to this trip
  for (const s of input.stops) {
    if (!existingIds.has(s.id)) {
      throw new Error(`Stop ${s.id} does not belong to trip ${tripId}`);
    }
  }

  // Must include every current stop (no partial subsets)
  if (inputIds.size !== existingIds.size) {
    throw new Error("Reorder payload must include all stops for the trip");
  }

  // Apply new ordering
  for (const s of input.stops) {
    await database
      .update(tripStops)
      .set({ sortOrder: s.sort_order })
      .where(eq(tripStops.id, s.id));
  }

  await touchUpdatedAt(tripId, database);

  return fetchTripDetail(tripId, userId, database);
}

export async function deleteTripStop(
  tripId: number,
  stopId: number,
  userId: number,
  database: Database = defaultDb,
): Promise<TripDetailDto | null> {
  // Verify trip ownership
  const [tripRow] = await database
    .select({ id: trips.id })
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
    .limit(1);

  if (!tripRow) {
    return null;
  }

  // Verify stop belongs to this trip
  const result = await database
    .delete(tripStops)
    .where(and(eq(tripStops.id, stopId), eq(tripStops.tripId, tripId)))
    .returning({ id: tripStops.id });

  if (result.length === 0) {
    return null;
  }

  // Compact remaining sort orders back to 1..n
  const remaining = await database
    .select({ id: tripStops.id })
    .from(tripStops)
    .where(eq(tripStops.tripId, tripId))
    .orderBy(asc(tripStops.sortOrder), asc(tripStops.id));

  for (let i = 0; i < remaining.length; i++) {
    await database
      .update(tripStops)
      .set({ sortOrder: i + 1 })
      .where(eq(tripStops.id, remaining[i].id));
  }

  await touchUpdatedAt(tripId, database);

  return fetchTripDetail(tripId, userId, database);
}
