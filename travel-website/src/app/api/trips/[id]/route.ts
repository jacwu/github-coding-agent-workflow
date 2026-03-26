import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { parseTripUpdateBody, isValidationError } from "@/lib/trips";
import { getTripDetail, updateTrip, deleteTrip } from "@/lib/trip-service";

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

export async function GET(
  _request: Request,
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

    const result = getTripDetail(userId, tripId);
    if (!result) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 },
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

    const parsed = parseTripUpdateBody(body);
    if (isValidationError(parsed)) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const result = updateTrip(userId, tripId, parsed);
    if (!result) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 },
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

export async function DELETE(
  _request: Request,
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

    const deleted = deleteTrip(userId, tripId);
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
