import { NextResponse } from "next/server";

import { parseListParams, isValidationError } from "@/lib/destinations";
import { getDestinations } from "@/lib/destination-service";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const params = parseListParams(searchParams);

    if (isValidationError(params)) {
      return NextResponse.json({ error: params.error }, { status: 400 });
    }

    const result = getDestinations(params);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
