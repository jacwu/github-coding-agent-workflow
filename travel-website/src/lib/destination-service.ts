import "server-only";

import { and, asc, count, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";

import { db as defaultDb } from "@/db/index";
import { destinations } from "@/db/schema";

type Database = typeof defaultDb;

const IMAGE_PATH_PREFIX = "/images/destinations/";

const VALID_SORT_VALUES = ["rating", "price", "popularity"] as const;
type SortValue = (typeof VALID_SORT_VALUES)[number];

export function isValidSort(value: string): value is SortValue {
  return (VALID_SORT_VALUES as readonly string[]).includes(value);
}

export interface ListDestinationsParams {
  q?: string;
  region?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: SortValue;
  page?: number;
  limit?: number;
}

interface DestinationListItem {
  id: number;
  name: string;
  country: string;
  category: string;
  price_level: number;
  rating: number;
  image: string;
}

interface DestinationDetail {
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

interface ListDestinationsResult {
  data: DestinationListItem[];
  total: number;
  page: number;
  limit: number;
}

type DestinationRow = typeof destinations.$inferSelect;

function toImagePath(filename: string): string {
  return `${IMAGE_PATH_PREFIX}${filename}`;
}

function toListItem(row: DestinationRow): DestinationListItem {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    category: row.category,
    price_level: row.priceLevel,
    rating: row.rating,
    image: toImagePath(row.image),
  };
}

function toDetail(row: DestinationRow): DestinationDetail {
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
    image: toImagePath(row.image),
  };
}

function buildWhereConditions(params: ListDestinationsParams) {
  const conditions = [];

  if (params.q) {
    const trimmed = params.q.trim();
    if (trimmed.length > 0) {
      const pattern = `%${trimmed}%`;
      conditions.push(
        or(
          like(sql`LOWER(${destinations.name})`, pattern.toLowerCase()),
          like(sql`LOWER(${destinations.country})`, pattern.toLowerCase()),
          like(sql`LOWER(${destinations.description})`, pattern.toLowerCase()),
        ),
      );
    }
  }

  if (params.region) {
    conditions.push(
      eq(sql`LOWER(${destinations.region})`, params.region.toLowerCase()),
    );
  }

  if (params.category) {
    conditions.push(
      eq(sql`LOWER(${destinations.category})`, params.category.toLowerCase()),
    );
  }

  if (params.priceMin !== undefined) {
    conditions.push(gte(destinations.priceLevel, params.priceMin));
  }

  if (params.priceMax !== undefined) {
    conditions.push(lte(destinations.priceLevel, params.priceMax));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function buildOrderBy(sortValue?: SortValue) {
  switch (sortValue) {
    case "price":
      return [asc(destinations.priceLevel), desc(destinations.rating), asc(destinations.id)];
    case "rating":
    case "popularity":
    default:
      return [desc(destinations.rating), asc(destinations.name), asc(destinations.id)];
  }
}

export async function listDestinations(
  params: ListDestinationsParams = {},
  database: Database = defaultDb,
): Promise<ListDestinationsResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 12;
  const offset = (page - 1) * limit;

  const whereCondition = buildWhereConditions(params);
  const orderBy = buildOrderBy(params.sort);

  const [totalResult] = await database
    .select({ value: count() })
    .from(destinations)
    .where(whereCondition);

  const total = totalResult?.value ?? 0;

  const rows = await database
    .select()
    .from(destinations)
    .where(whereCondition)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  return {
    data: rows.map(toListItem),
    total,
    page,
    limit,
  };
}

export async function getDestinationById(
  id: number,
  database: Database = defaultDb,
): Promise<DestinationDetail | null> {
  const [row] = await database
    .select()
    .from(destinations)
    .where(eq(destinations.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  return toDetail(row);
}
