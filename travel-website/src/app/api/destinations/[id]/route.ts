import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { destinations } from "@/db/schema";
import { serializeDestinationDetail } from "@/lib/destinations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);

    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json(
        { error: "Invalid destination id" },
        { status: 400 },
      );
    }

    const row = db
      .select()
      .from(destinations)
      .where(eq(destinations.id, id))
      .get();

    if (!row) {
      return NextResponse.json(
        { error: "Destination not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(serializeDestinationDetail(row));
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
