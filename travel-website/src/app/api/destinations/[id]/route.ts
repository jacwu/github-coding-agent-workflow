import { NextResponse } from "next/server";

import { getDestinationById } from "@/lib/destination-service";

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

    const result = getDestinationById(id);

    if (!result) {
      return NextResponse.json(
        { error: "Destination not found" },
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
