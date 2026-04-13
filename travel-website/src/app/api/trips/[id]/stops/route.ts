import { NextResponse } from "next/server";

import {
  addTripStop,
  reorderTripStops,
  DestinationNotFoundError,
} from "@/lib/trip-service";

import { getAuthenticatedUserId, parsePositiveInt } from "../../_helpers";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const userId = await getAuthenticatedUserId();
    if (userId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idParam } = await params;
    const tripId = parsePositiveInt(idParam);
    if (tripId === null) {
      return NextResponse.json(
        { error: "Invalid trip id" },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { destination_id, arrival_date, departure_date, notes } =
      body as Record<string, unknown>;

    if (
      typeof destination_id !== "number" ||
      !Number.isInteger(destination_id) ||
      destination_id < 1
    ) {
      return NextResponse.json(
        { error: "destination_id must be a positive integer" },
        { status: 400 },
      );
    }

    if (arrival_date !== undefined && arrival_date !== null) {
      if (typeof arrival_date !== "string" || !DATE_RE.test(arrival_date)) {
        return NextResponse.json(
          { error: "Invalid arrival_date format" },
          { status: 400 },
        );
      }
    }

    if (departure_date !== undefined && departure_date !== null) {
      if (
        typeof departure_date !== "string" ||
        !DATE_RE.test(departure_date)
      ) {
        return NextResponse.json(
          { error: "Invalid departure_date format" },
          { status: 400 },
        );
      }
    }

    if (arrival_date && departure_date && arrival_date > departure_date) {
      return NextResponse.json(
        { error: "arrival_date must not be after departure_date" },
        { status: 400 },
      );
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return NextResponse.json(
        { error: "notes must be a string" },
        { status: 400 },
      );
    }

    const result = await addTripStop(
      tripId,
      userId,
      {
        destination_id,
        arrival_date: (arrival_date as string) ?? null,
        departure_date: (departure_date as string) ?? null,
        notes: (notes as string) ?? null,
      },
    );

    if (!result) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DestinationNotFoundError) {
      return NextResponse.json(
        { error: "Destination not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const userId = await getAuthenticatedUserId();
    if (userId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idParam } = await params;
    const tripId = parsePositiveInt(idParam);
    if (tripId === null) {
      return NextResponse.json(
        { error: "Invalid trip id" },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { stops } = body as Record<string, unknown>;

    if (!Array.isArray(stops) || stops.length === 0) {
      return NextResponse.json(
        { error: "stops must be a non-empty array" },
        { status: 400 },
      );
    }

    const ids = new Set<number>();
    const sortOrders = new Set<number>();

    for (const item of stops) {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        return NextResponse.json(
          { error: "Each stop must be an object with id and sort_order" },
          { status: 400 },
        );
      }

      const { id, sort_order } = item as Record<string, unknown>;

      if (
        typeof id !== "number" ||
        !Number.isInteger(id) ||
        id < 1
      ) {
        return NextResponse.json(
          { error: "Each stop must have a positive integer id" },
          { status: 400 },
        );
      }

      if (
        typeof sort_order !== "number" ||
        !Number.isInteger(sort_order) ||
        sort_order < 1
      ) {
        return NextResponse.json(
          { error: "Each stop must have a positive integer sort_order" },
          { status: 400 },
        );
      }

      if (ids.has(id)) {
        return NextResponse.json(
          { error: "Duplicate stop id in reorder payload" },
          { status: 400 },
        );
      }

      if (sortOrders.has(sort_order)) {
        return NextResponse.json(
          { error: "Duplicate sort_order in reorder payload" },
          { status: 400 },
        );
      }

      ids.add(id);
      sortOrders.add(sort_order);
    }

    for (let expectedSortOrder = 1; expectedSortOrder <= stops.length; expectedSortOrder += 1) {
      if (!sortOrders.has(expectedSortOrder)) {
        return NextResponse.json(
          {
            error: `sort_order values must be contiguous from 1 to ${stops.length}`,
          },
          { status: 400 },
        );
      }
    }

    const result = await reorderTripStops(
      tripId,
      userId,
      {
        stops: stops.map((s: Record<string, unknown>) => ({
          id: s.id as number,
          sort_order: s.sort_order as number,
        })),
      },
    );

    if (!result) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not belong")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message.includes("must include all")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message.includes("contiguous")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
