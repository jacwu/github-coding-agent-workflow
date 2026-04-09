import { NextResponse } from "next/server";

import { getDestinationById } from "@/lib/destination-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: idParam } = await params;
    const num = Number(idParam);

    if (!Number.isInteger(num) || num < 1) {
      return NextResponse.json(
        { error: "Invalid destination id" },
        { status: 400 },
      );
    }

    const destination = await getDestinationById(num);

    if (!destination) {
      return NextResponse.json(
        { error: "Destination not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(destination);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
