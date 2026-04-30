import { NextResponse } from "next/server";

import { deleteTripStop, updateTripStop } from "@/lib/trip-service";

import { getAuthenticatedUserId, parsePositiveInt } from "../../../_helpers";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; stopId: string }> },
): Promise<NextResponse> {
  try {
    const userId = await getAuthenticatedUserId();
    if (userId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idParam, stopId: stopIdParam } = await params;
    const tripId = parsePositiveInt(idParam);
    if (tripId === null) {
      return NextResponse.json(
        { error: "Invalid trip id" },
        { status: 400 },
      );
    }

    const stopId = parsePositiveInt(stopIdParam);
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

    const { arrival_date, departure_date, notes } =
      body as Record<string, unknown>;

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

    const result = await updateTripStop(tripId, stopId, userId, {
      arrival_date: arrival_date as string | null | undefined,
      departure_date: departure_date as string | null | undefined,
      notes: notes as string | null | undefined,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Trip or stop not found" },
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
    const userId = await getAuthenticatedUserId();
    if (userId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idParam, stopId: stopIdParam } = await params;
    const tripId = parsePositiveInt(idParam);
    if (tripId === null) {
      return NextResponse.json(
        { error: "Invalid trip id" },
        { status: 400 },
      );
    }

    const stopId = parsePositiveInt(stopIdParam);
    if (stopId === null) {
      return NextResponse.json(
        { error: "Invalid stop id" },
        { status: 400 },
      );
    }

    const result = await deleteTripStop(tripId, stopId, userId);
    if (!result) {
      return NextResponse.json(
        { error: "Trip or stop not found" },
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
