import { NextResponse } from "next/server";

import { isValidSort, listDestinations } from "@/lib/destination-service";
import { parseDestinationSearchParams } from "@/lib/destination-query-params";

function validateStrictPositiveInt(value: string | null, name: string): string | null {
  if (value === null) {
    return null;
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    return `Invalid ${name} parameter`;
  }
  return null;
}

function validateStrictPrice(value: string | null, name: string): string | null {
  if (value === null) {
    return null;
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    return `Invalid ${name} parameter`;
  }
  return null;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // API route performs strict validation before delegating to shared parsing
    const pageError = validateStrictPositiveInt(searchParams.get("page"), "page");
    if (pageError) {
      return NextResponse.json({ error: pageError }, { status: 400 });
    }

    const limitError = validateStrictPositiveInt(searchParams.get("limit"), "limit");
    if (limitError) {
      return NextResponse.json({ error: limitError }, { status: 400 });
    }

    const sortParam = searchParams.get("sort");
    if (sortParam !== null && !isValidSort(sortParam)) {
      return NextResponse.json({ error: "Invalid sort parameter" }, { status: 400 });
    }

    const priceMinError = validateStrictPrice(searchParams.get("price_min"), "price_min");
    if (priceMinError) {
      return NextResponse.json({ error: priceMinError }, { status: 400 });
    }

    const priceMaxError = validateStrictPrice(searchParams.get("price_max"), "price_max");
    if (priceMaxError) {
      return NextResponse.json({ error: priceMaxError }, { status: 400 });
    }

    // Validate price_min <= price_max when both present
    const priceMin = searchParams.get("price_min");
    const priceMax = searchParams.get("price_max");
    if (priceMin !== null && priceMax !== null) {
      if (Number(priceMin) > Number(priceMax)) {
        return NextResponse.json(
          { error: "price_min must not exceed price_max" },
          { status: 400 },
        );
      }
    }

    // Delegate to shared parsing for normalization
    const { params } = parseDestinationSearchParams(searchParams);

    const result = await listDestinations(params);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
