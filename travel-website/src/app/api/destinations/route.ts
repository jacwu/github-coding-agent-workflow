import { NextResponse } from "next/server";

import { isValidSort, listDestinations } from "@/lib/destination-service";

import type { ListDestinationsParams } from "@/lib/destination-service";

function parsePositiveInt(value: string | null, name: string): { value: number | undefined; error: string | null } {
  if (value === null) {
    return { value: undefined, error: null };
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    return { value: undefined, error: `Invalid ${name} parameter` };
  }
  return { value: num, error: null };
}

function parsePriceParam(value: string | null, name: string): { value: number | undefined; error: string | null } {
  if (value === null) {
    return { value: undefined, error: null };
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    return { value: undefined, error: `Invalid ${name} parameter` };
  }
  return { value: num, error: null };
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse and validate page
    const pageResult = parsePositiveInt(searchParams.get("page"), "page");
    if (pageResult.error) {
      return NextResponse.json({ error: pageResult.error }, { status: 400 });
    }

    // Parse and validate limit
    const limitResult = parsePositiveInt(searchParams.get("limit"), "limit");
    if (limitResult.error) {
      return NextResponse.json({ error: limitResult.error }, { status: 400 });
    }

    // Clamp limit to 100
    const limit = limitResult.value !== undefined ? Math.min(limitResult.value, 100) : undefined;

    // Validate sort
    const sortParam = searchParams.get("sort");
    if (sortParam !== null && !isValidSort(sortParam)) {
      return NextResponse.json({ error: "Invalid sort parameter" }, { status: 400 });
    }

    // Parse and validate price_min
    const priceMinResult = parsePriceParam(searchParams.get("price_min"), "price_min");
    if (priceMinResult.error) {
      return NextResponse.json({ error: priceMinResult.error }, { status: 400 });
    }

    // Parse and validate price_max
    const priceMaxResult = parsePriceParam(searchParams.get("price_max"), "price_max");
    if (priceMaxResult.error) {
      return NextResponse.json({ error: priceMaxResult.error }, { status: 400 });
    }

    // Validate price_min <= price_max when both present
    if (priceMinResult.value !== undefined && priceMaxResult.value !== undefined) {
      if (priceMinResult.value > priceMaxResult.value) {
        return NextResponse.json(
          { error: "price_min must not exceed price_max" },
          { status: 400 },
        );
      }
    }

    const params: ListDestinationsParams = {
      q: searchParams.get("q") ?? undefined,
      region: searchParams.get("region") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      priceMin: priceMinResult.value,
      priceMax: priceMaxResult.value,
      sort: sortParam as ListDestinationsParams["sort"],
      page: pageResult.value,
      limit,
    };

    const result = await listDestinations(params);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
