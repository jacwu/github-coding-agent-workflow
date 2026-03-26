import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { parseStopCreateBody, parseStopReorderBody, isValidationError } from "@/lib/trips";
import { addStop, reorderStops } from "@/lib/trip-service";

function parseUserId(session: { user?: { id?: string } } | null): number | null {
  if (!session?.user?.id) return null;
  const id = Number(session.user.id);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

function parseIdParam(idParam: string): number | null {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const userId = parseUserId(session);
    if (userId === null) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id: idParam } = await params;
    const tripId = parseIdParam(idParam);
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
        { error: "Request body must be a JSON object" },
        { status: 400 },
      );
    }

    const parsed = parseStopCreateBody(body);
    if (isValidationError(parsed)) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const result = addStop(userId, tripId, parsed);
    if (result === "trip_not_found") {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 },
      );
    }
    if (result === "destination_not_found") {
      return NextResponse.json(
        { error: "Destination not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result, { status: 201 });
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
    const session = await auth();
    const userId = parseUserId(session);
    if (userId === null) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id: idParam } = await params;
    const tripId = parseIdParam(idParam);
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
        { error: "Request body must be a JSON object" },
        { status: 400 },
      );
    }

    const parsed = parseStopReorderBody(body);
    if (isValidationError(parsed)) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const result = reorderStops(userId, tripId, parsed.stops);
    if (result === null) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 },
      );
    }
    if (result === "stop_count_mismatch") {
      return NextResponse.json(
        { error: "stops array must include all stops belonging to the trip" },
        { status: 400 },
      );
    }
    if (result === "invalid_stop_id") {
      return NextResponse.json(
        { error: "All stop ids must belong to the specified trip" },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
