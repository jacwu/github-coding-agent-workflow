import { sql, and, gte, lte, asc, desc } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { destinations, type Destination } from "@/db/schema";

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const MIN_PRICE = 1;
const MAX_PRICE = 5;

const IMAGE_BASE_PATH = "/images/destinations/";

// ─── Sort tokens ────────────────────────────────────────────────────────────

const SORT_TOKENS = {
  rating: [desc(destinations.rating), asc(destinations.name)],
  rating_desc: [desc(destinations.rating), asc(destinations.name)],
  price: [asc(destinations.priceLevel), asc(destinations.name)],
  price_asc: [asc(destinations.priceLevel), asc(destinations.name)],
  price_desc: [desc(destinations.priceLevel), asc(destinations.name)],
  popularity: [desc(destinations.rating), desc(destinations.createdAt), asc(destinations.name)],
} as const;

type SortToken = keyof typeof SORT_TOKENS;

const DEFAULT_ORDER = SORT_TOKENS.popularity;

// ─── Query parameter types ──────────────────────────────────────────────────

export interface DestinationListParams {
  q?: string;
  region?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: SortToken;
  page: number;
  limit: number;
}

interface ValidationError {
  error: string;
}

// ─── Query parameter parsing ────────────────────────────────────────────────

function trimOrUndefined(value: string | null): string | undefined {
  if (value === null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePositiveInt(value: string | null, fieldName: string): number | ValidationError {
  if (value === null) return 0; // sentinel for "not provided"
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    return { error: `${fieldName} must be a positive integer` };
  }
  return n;
}

export function parseListParams(
  searchParams: URLSearchParams,
): DestinationListParams | ValidationError {
  const q = trimOrUndefined(searchParams.get("q"));
  const region = trimOrUndefined(searchParams.get("region"));
  const category = trimOrUndefined(searchParams.get("category"));
  const sortRaw = trimOrUndefined(searchParams.get("sort"));

  // Validate sort token
  let sort: SortToken | undefined;
  if (sortRaw !== undefined) {
    if (!(sortRaw in SORT_TOKENS)) {
      return { error: `Invalid sort value: ${sortRaw}` };
    }
    sort = sortRaw as SortToken;
  }

  // Parse price_min
  const priceMinRaw = searchParams.get("price_min");
  let priceMin: number | undefined;
  if (priceMinRaw !== null) {
    const parsed = parsePositiveInt(priceMinRaw, "price_min");
    if (typeof parsed === "object") return parsed;
    if (parsed < MIN_PRICE || parsed > MAX_PRICE) {
      return { error: `price_min must be between ${MIN_PRICE} and ${MAX_PRICE}` };
    }
    priceMin = parsed;
  }

  // Parse price_max
  const priceMaxRaw = searchParams.get("price_max");
  let priceMax: number | undefined;
  if (priceMaxRaw !== null) {
    const parsed = parsePositiveInt(priceMaxRaw, "price_max");
    if (typeof parsed === "object") return parsed;
    if (parsed < MIN_PRICE || parsed > MAX_PRICE) {
      return { error: `price_max must be between ${MIN_PRICE} and ${MAX_PRICE}` };
    }
    priceMax = parsed;
  }

  // Validate price range
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    return { error: "price_min must be less than or equal to price_max" };
  }

  // Parse page
  const pageRaw = searchParams.get("page");
  let page = DEFAULT_PAGE;
  if (pageRaw !== null) {
    const parsed = parsePositiveInt(pageRaw, "page");
    if (typeof parsed === "object") return parsed;
    page = parsed;
  }

  // Parse limit
  const limitRaw = searchParams.get("limit");
  let limit = DEFAULT_LIMIT;
  if (limitRaw !== null) {
    const parsed = parsePositiveInt(limitRaw, "limit");
    if (typeof parsed === "object") return parsed;
    limit = Math.min(parsed, MAX_LIMIT);
  }

  return { q, region, category, priceMin, priceMax, sort, page, limit };
}

// ─── Filter building ────────────────────────────────────────────────────────

function escapeLikePattern(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function buildWhereConditions(params: DestinationListParams): SQL | undefined {
  const conditions: SQL[] = [];

  if (params.q) {
    const pattern = `%${escapeLikePattern(params.q)}%`;
    conditions.push(
      sql`(
        ${destinations.name} LIKE ${pattern} ESCAPE '\\' OR
        ${destinations.description} LIKE ${pattern} ESCAPE '\\' OR
        ${destinations.country} LIKE ${pattern} ESCAPE '\\' OR
        ${destinations.region} LIKE ${pattern} ESCAPE '\\' OR
        ${destinations.category} LIKE ${pattern} ESCAPE '\\'
      )`,
    );
  }

  if (params.region) {
    conditions.push(
      sql`LOWER(${destinations.region}) = LOWER(${params.region})`,
    );
  }

  if (params.category) {
    conditions.push(
      sql`LOWER(${destinations.category}) = LOWER(${params.category})`,
    );
  }

  if (params.priceMin !== undefined) {
    conditions.push(gte(destinations.priceLevel, params.priceMin));
  }

  if (params.priceMax !== undefined) {
    conditions.push(lte(destinations.priceLevel, params.priceMax));
  }

  if (conditions.length === 0) return undefined;
  return and(...conditions);
}

// ─── Order building ─────────────────────────────────────────────────────────

export function buildOrderBy(sort?: SortToken): (typeof DEFAULT_ORDER)[number][] {
  if (sort && sort in SORT_TOKENS) {
    return [...SORT_TOKENS[sort]];
  }
  return [...DEFAULT_ORDER];
}

// ─── Serialization ──────────────────────────────────────────────────────────

export interface DestinationListItem {
  id: number;
  name: string;
  country: string;
  region: string | null;
  category: string;
  price_level: number;
  rating: number;
  image: string;
}

export interface DestinationDetail {
  id: number;
  name: string;
  description: string | null;
  country: string;
  region: string | null;
  category: string;
  price_level: number;
  rating: number;
  best_season: string | null;
  latitude: number | null;
  longitude: number | null;
  image: string;
}

function imageUrl(filename: string): string {
  return `${IMAGE_BASE_PATH}${filename}`;
}

export function serializeDestinationListItem(row: Destination): DestinationListItem {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    region: row.region,
    category: row.category,
    price_level: row.priceLevel,
    rating: row.rating,
    image: imageUrl(row.image),
  };
}

export function serializeDestinationDetail(row: Destination): DestinationDetail {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    country: row.country,
    region: row.region,
    category: row.category,
    price_level: row.priceLevel,
    rating: row.rating,
    best_season: row.bestSeason,
    latitude: row.latitude,
    longitude: row.longitude,
    image: imageUrl(row.image),
  };
}

// ─── Validation helper ──────────────────────────────────────────────────────

export function isValidationError(result: unknown): result is ValidationError {
  return typeof result === "object" && result !== null && "error" in result;
}
