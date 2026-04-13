import { NextResponse } from "next/server";

import { deleteTripStop } from "@/lib/trip-service";

import { getAuthenticatedUserId, parsePositiveInt } from "../../../_helpers";

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
