import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { parseTripCreateBody, isValidationError, parseUserId } from "@/lib/trips";
import { getUserTrips, createTrip } from "@/lib/trip-service";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    const userId = parseUserId(session);
    if (userId === null) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const result = getUserTrips(userId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();
    const userId = parseUserId(session);
    if (userId === null) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
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

    const parsed = parseTripCreateBody(body);
    if (isValidationError(parsed)) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const result = createTrip(userId, parsed);
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
