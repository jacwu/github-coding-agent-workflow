import { NextResponse } from "next/server";

import {
  getTripByIdForUser,
  updateTripForUser,
  deleteTripForUser,
} from "@/lib/trip-service";

import { getAuthenticatedUserId, parsePositiveInt } from "../_helpers";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ["draft", "planned", "completed"] as const;
const ALLOWED_UPDATE_FIELDS = new Set(["title", "start_date", "end_date", "status"]);

export async function GET(
  _request: Request,
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

    const trip = await getTripByIdForUser(tripId, userId);
    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(trip);
  } catch {
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

    const unknownField = Object.keys(body).find(
      (key) => !ALLOWED_UPDATE_FIELDS.has(key),
    );
    if (unknownField) {
      return NextResponse.json(
        { error: `Unknown field: ${unknownField}` },
        { status: 400 },
      );
    }

    const { title, start_date, end_date, status } = body as Record<
      string,
      unknown
    >;

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json(
          { error: "Title must be a non-empty string" },
          { status: 400 },
        );
      }
    }

    if (start_date !== undefined && start_date !== null) {
      if (typeof start_date !== "string" || !DATE_RE.test(start_date)) {
        return NextResponse.json(
          { error: "Invalid start_date format" },
          { status: 400 },
        );
      }
    }

    if (end_date !== undefined && end_date !== null) {
      if (typeof end_date !== "string" || !DATE_RE.test(end_date)) {
        return NextResponse.json(
          { error: "Invalid end_date format" },
          { status: 400 },
        );
      }
    }

    if (status !== undefined) {
      if (
        typeof status !== "string" ||
        !(VALID_STATUSES as readonly string[]).includes(status)
      ) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 },
        );
      }
    }

    if (
      start_date !== undefined &&
      end_date !== undefined &&
      start_date &&
      end_date &&
      start_date > end_date
    ) {
      return NextResponse.json(
        { error: "start_date must not be after end_date" },
        { status: 400 },
      );
    }

    const existingTrip = await getTripByIdForUser(tripId, userId);
    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 },
      );
    }

    // Date consistency: resolve effective start/end
    const effectiveStart =
      start_date !== undefined
        ? (start_date as string | null)
        : existingTrip.start_date;
    const effectiveEnd =
      end_date !== undefined
        ? (end_date as string | null)
        : existingTrip.end_date;

    if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
      return NextResponse.json(
        { error: "start_date must not be after end_date" },
        { status: 400 },
      );
    }

    const updated = await updateTripForUser(
      tripId,
      userId,
      {
        title: title !== undefined ? (title as string).trim() : undefined,
        start_date: effectiveStart,
        end_date: effectiveEnd,
        status: status as string | undefined,
      },
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
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

    const deleted = await deleteTripForUser(tripId, userId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
