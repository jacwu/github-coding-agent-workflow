import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { deleteStop } from "@/lib/trip-service";

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
