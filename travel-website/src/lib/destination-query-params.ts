import { isValidSort } from "@/lib/destination-service";

import type { ListDestinationsParams } from "@/lib/destination-service";

type RawSearchParams = Record<string, string | string[] | undefined>;

function getString(params: RawSearchParams, key: string): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? undefined;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    return undefined;
  }
  return num;
}

function parsePriceLevel(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    return undefined;
  }
  return num;
}

export interface ParsedDestinationQuery {
  params: ListDestinationsParams;
  raw: {
    q: string;
    region: string;
    category: string;
    priceMin: string;
    priceMax: string;
    sort: string;
    page: string;
    limit: string;
  };
}

export function parseDestinationSearchParams(
  searchParams: RawSearchParams,
): ParsedDestinationQuery {
  const rawQ = getString(searchParams, "q") ?? "";
  const rawRegion = getString(searchParams, "region") ?? "";
  const rawCategory = getString(searchParams, "category") ?? "";
  const rawPriceMin = getString(searchParams, "price_min") ?? "";
  const rawPriceMax = getString(searchParams, "price_max") ?? "";
  const rawSort = getString(searchParams, "sort") ?? "";
  const rawPage = getString(searchParams, "page") ?? "";
  const rawLimit = getString(searchParams, "limit") ?? "";

  const page = parsePositiveInt(rawPage || undefined) ?? 1;
  const parsedLimit = parsePositiveInt(rawLimit || undefined);
  const limit = parsedLimit !== undefined ? Math.min(parsedLimit, 100) : 12;

  const sort = rawSort && isValidSort(rawSort) ? (rawSort as ListDestinationsParams["sort"]) : undefined;

  let priceMin = parsePriceLevel(rawPriceMin || undefined);
  let priceMax = parsePriceLevel(rawPriceMax || undefined);

  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    priceMin = undefined;
    priceMax = undefined;
  }

  const params: ListDestinationsParams = {
    q: rawQ || undefined,
    region: rawRegion || undefined,
    category: rawCategory || undefined,
    priceMin,
    priceMax,
    sort,
    page,
    limit,
  };

  return {
    params,
    raw: {
      q: rawQ,
      region: rawRegion,
      category: rawCategory,
      priceMin: rawPriceMin,
      priceMax: rawPriceMax,
      sort: rawSort,
      page: rawPage,
      limit: rawLimit,
    },
  };
}
