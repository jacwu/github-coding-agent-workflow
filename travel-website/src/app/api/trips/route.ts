import { NextResponse } from "next/server";

import {
  listTripsForUser,
  createTrip,
} from "@/lib/trip-service";

import { getAuthenticatedUserId } from "./_helpers";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getAuthenticatedUserId();
    if (userId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trips = await listTripsForUser(userId);
    return NextResponse.json(trips);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const userId = await getAuthenticatedUserId();
    if (userId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { title, start_date, end_date } = body as Record<string, unknown>;

    if (typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 },
      );
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

    if (
      start_date && end_date &&
      typeof start_date === "string" &&
      typeof end_date === "string" &&
      start_date > end_date
    ) {
      return NextResponse.json(
        { error: "start_date must not be after end_date" },
        { status: 400 },
      );
    }

    const trip = await createTrip(
      {
        title: title.trim(),
        start_date: (start_date as string) ?? null,
        end_date: (end_date as string) ?? null,
      },
      userId,
    );

    return NextResponse.json(trip, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
