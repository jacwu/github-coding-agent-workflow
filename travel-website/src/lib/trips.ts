// ─── Trip validation, parsing, type interfaces, and serialization ───────────

import type { Trip, TripStop, Destination } from "@/db/schema";

// ─── Constants ──────────────────────────────────────────────────────────────

const IMAGE_BASE_PATH = "/images/destinations/";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const VALID_STATUSES = ["draft", "planned", "completed"] as const;
type TripStatus = (typeof VALID_STATUSES)[number];

// ─── Validation helpers ─────────────────────────────────────────────────────

interface ValidationError {
  error: string;
}

export function isValidationError(result: unknown): result is ValidationError {
  return typeof result === "object" && result !== null && "error" in result;
}

function isValidDate(value: string): boolean {
  return DATE_PATTERN.test(value);
}

function isValidStatus(value: string): value is TripStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

// ─── Request body types ─────────────────────────────────────────────────────

export interface TripCreateBody {
  title: string;
  startDate: string | null;
  endDate: string | null;
  status: TripStatus;
}

export interface TripUpdateBody {
  title: string;
  startDate: string | null;
  endDate: string | null;
  status: TripStatus;
}

export interface StopCreateBody {
  destinationId: number;
  arrivalDate: string | null;
  departureDate: string | null;
  notes: string | null;
}

export interface StopReorderItem {
  id: number;
  sort_order: number;
}

export interface StopReorderBody {
  stops: StopReorderItem[];
}

// ─── Request body parsing ───────────────────────────────────────────────────

export function parseTripCreateBody(body: unknown): TripCreateBody | ValidationError {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const obj = body as Record<string, unknown>;

  // title is required
  if (typeof obj.title !== "string" || obj.title.trim() === "") {
    return { error: "title is required and must be a non-empty string" };
  }
  const title = obj.title.trim();

  // start_date is optional
  let startDate: string | null = null;
  if (obj.start_date !== undefined && obj.start_date !== null) {
    if (typeof obj.start_date !== "string" || obj.start_date === "" || !isValidDate(obj.start_date)) {
      return { error: "start_date must be a valid date in YYYY-MM-DD format" };
    }
    startDate = obj.start_date;
  }

  // end_date is optional
  let endDate: string | null = null;
  if (obj.end_date !== undefined && obj.end_date !== null) {
    if (typeof obj.end_date !== "string" || obj.end_date === "" || !isValidDate(obj.end_date)) {
      return { error: "end_date must be a valid date in YYYY-MM-DD format" };
    }
    endDate = obj.end_date;
  }

  // date range validation
  if (startDate !== null && endDate !== null && startDate > endDate) {
    return { error: "start_date must be less than or equal to end_date" };
  }

  // status defaults to draft
  let status: TripStatus = "draft";
  if (obj.status !== undefined && obj.status !== null) {
    if (typeof obj.status !== "string" || !isValidStatus(obj.status)) {
      return { error: "status must be one of: draft, planned, completed" };
    }
    status = obj.status;
  }

  return { title, startDate, endDate, status };
}

export function parseTripUpdateBody(body: unknown): TripUpdateBody | ValidationError {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const obj = body as Record<string, unknown>;

  // title is required for PUT
  if (typeof obj.title !== "string" || obj.title.trim() === "") {
    return { error: "title is required and must be a non-empty string" };
  }
  const title = obj.title.trim();

  // start_date is optional
  let startDate: string | null = null;
  if (obj.start_date !== undefined && obj.start_date !== null) {
    if (typeof obj.start_date !== "string" || obj.start_date === "" || !isValidDate(obj.start_date)) {
      return { error: "start_date must be a valid date in YYYY-MM-DD format" };
    }
    startDate = obj.start_date;
  }

  // end_date is optional
  let endDate: string | null = null;
  if (obj.end_date !== undefined && obj.end_date !== null) {
    if (typeof obj.end_date !== "string" || obj.end_date === "" || !isValidDate(obj.end_date)) {
      return { error: "end_date must be a valid date in YYYY-MM-DD format" };
    }
    endDate = obj.end_date;
  }

  // date range validation
  if (startDate !== null && endDate !== null && startDate > endDate) {
    return { error: "start_date must be less than or equal to end_date" };
  }

  // status is required for PUT (full update)
  let status: TripStatus = "draft";
  if (obj.status !== undefined && obj.status !== null) {
    if (typeof obj.status !== "string" || !isValidStatus(obj.status)) {
      return { error: "status must be one of: draft, planned, completed" };
    }
    status = obj.status;
  }

  return { title, startDate, endDate, status };
}

export function parseStopCreateBody(body: unknown): StopCreateBody | ValidationError {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const obj = body as Record<string, unknown>;

  // destination_id is required
  if (obj.destination_id === undefined || obj.destination_id === null) {
    return { error: "destination_id is required" };
  }
  const destinationId = Number(obj.destination_id);
  if (!Number.isInteger(destinationId) || destinationId < 1) {
    return { error: "destination_id must be a positive integer" };
  }

  // arrival_date is optional
  let arrivalDate: string | null = null;
  if (obj.arrival_date !== undefined && obj.arrival_date !== null) {
    if (typeof obj.arrival_date !== "string" || obj.arrival_date === "" || !isValidDate(obj.arrival_date)) {
      return { error: "arrival_date must be a valid date in YYYY-MM-DD format" };
    }
    arrivalDate = obj.arrival_date;
  }

  // departure_date is optional
  let departureDate: string | null = null;
  if (obj.departure_date !== undefined && obj.departure_date !== null) {
    if (typeof obj.departure_date !== "string" || obj.departure_date === "" || !isValidDate(obj.departure_date)) {
      return { error: "departure_date must be a valid date in YYYY-MM-DD format" };
    }
    departureDate = obj.departure_date;
  }

  // date range validation
  if (arrivalDate !== null && departureDate !== null && arrivalDate > departureDate) {
    return { error: "arrival_date must be less than or equal to departure_date" };
  }

  // notes is optional
  let notes: string | null = null;
  if (obj.notes !== undefined && obj.notes !== null) {
    if (typeof obj.notes !== "string") {
      return { error: "notes must be a string" };
    }
    const trimmed = obj.notes.trim();
    notes = trimmed.length > 0 ? trimmed : null;
  }

  return { destinationId, arrivalDate, departureDate, notes };
}

export function parseStopReorderBody(body: unknown): StopReorderBody | ValidationError {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const obj = body as Record<string, unknown>;

  if (!Array.isArray(obj.stops)) {
    return { error: "stops must be an array" };
  }

  if (obj.stops.length === 0) {
    return { error: "stops array must not be empty" };
  }

  const stops: StopReorderItem[] = [];
  const seenIds = new Set<number>();
  const seenOrders = new Set<number>();

  for (const item of obj.stops) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return { error: "each stop must be an object with id and sort_order" };
    }

    const stopObj = item as Record<string, unknown>;

    const id = Number(stopObj.id);
    if (!Number.isInteger(id) || id < 1) {
      return { error: "each stop id must be a positive integer" };
    }

    const sortOrder = Number(stopObj.sort_order);
    if (!Number.isInteger(sortOrder) || sortOrder < 1) {
      return { error: "each sort_order must be a positive integer" };
    }

    if (seenIds.has(id)) {
      return { error: "stop ids must be unique" };
    }
    seenIds.add(id);

    if (seenOrders.has(sortOrder)) {
      return { error: "sort_order values must be unique" };
    }
    seenOrders.add(sortOrder);

    stops.push({ id, sort_order: sortOrder });
  }

  // Validate contiguous sequence starting at 1
  const sortedOrders = [...seenOrders].sort((a, b) => a - b);
  for (let i = 0; i < sortedOrders.length; i++) {
    if (sortedOrders[i] !== i + 1) {
      return { error: "sort_order values must form a contiguous sequence starting at 1" };
    }
  }

  return { stops };
}

// ─── Response types ─────────────────────────────────────────────────────────

export interface TripListItem {
  id: number;
  title: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  stop_count: number;
}

export interface TripStopDetail {
  id: number;
  destination_id: number;
  destination_name: string;
  destination_country: string;
  destination_image: string;
  sort_order: number;
  arrival_date: string | null;
  departure_date: string | null;
  notes: string | null;
}

export interface TripDetail {
  id: number;
  title: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  stops: TripStopDetail[];
}

// ─── Serialization ──────────────────────────────────────────────────────────

function imageUrl(filename: string): string {
  return `${IMAGE_BASE_PATH}${filename}`;
}

export function serializeTripListItem(
  row: Trip,
  stopCount: number,
): TripListItem {
  return {
    id: row.id,
    title: row.title,
    start_date: row.startDate,
    end_date: row.endDate,
    status: row.status,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    stop_count: stopCount,
  };
}

export function serializeTripStop(
  stop: TripStop,
  destination: Pick<Destination, "name" | "country" | "image">,
): TripStopDetail {
  return {
    id: stop.id,
    destination_id: stop.destinationId,
    destination_name: destination.name,
    destination_country: destination.country,
    destination_image: imageUrl(destination.image),
    sort_order: stop.sortOrder,
    arrival_date: stop.arrivalDate,
    departure_date: stop.departureDate,
    notes: stop.notes,
  };
}

export function serializeTripDetail(
  trip: Trip,
  stops: TripStopDetail[],
): TripDetail {
  return {
    id: trip.id,
    title: trip.title,
    start_date: trip.startDate,
    end_date: trip.endDate,
    status: trip.status,
    created_at: trip.createdAt,
    updated_at: trip.updatedAt,
    stops,
  };
}
