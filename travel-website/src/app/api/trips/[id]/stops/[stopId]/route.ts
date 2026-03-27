import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { parseUserId, parseIdParam, parseStopUpdateBody, isValidationError } from "@/lib/trips";
import { deleteStop, updateStop } from "@/lib/trip-service";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; stopId: string }> },
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

    const { id: idParam, stopId: stopIdParam } = await params;
    const tripId = parseIdParam(idParam);
    if (tripId === null) {
      return NextResponse.json(
        { error: "Invalid trip id" },
        { status: 400 },
      );
    }

    const stopId = parseIdParam(stopIdParam);
    if (stopId === null) {
      return NextResponse.json(
        { error: "Invalid stop id" },
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

    const parsed = parseStopUpdateBody(body);
    if (isValidationError(parsed)) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const result = updateStop(userId, tripId, stopId, parsed);
    if (result === "trip_not_found") {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 },
      );
    }
    if (result === "stop_not_found") {
      return NextResponse.json(
        { error: "Stop not found" },
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
  { params }: { params: Promise<{ id: string; stopId: string }> },
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

    const { id: idParam, stopId: stopIdParam } = await params;
    const tripId = parseIdParam(idParam);
    if (tripId === null) {
      return NextResponse.json(
        { error: "Invalid trip id" },
        { status: 400 },
      );
    }

    const stopId = parseIdParam(stopIdParam);
    if (stopId === null) {
      return NextResponse.json(
        { error: "Invalid stop id" },
        { status: 400 },
      );
    }

    const result = deleteStop(userId, tripId, stopId);
    if (result === "trip_not_found") {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 },
      );
    }
    if (result === "stop_not_found") {
      return NextResponse.json(
        { error: "Stop not found" },
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
