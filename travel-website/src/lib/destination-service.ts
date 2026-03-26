import { count, eq } from "drizzle-orm";

import { db } from "@/db";
import { destinations } from "@/db/schema";
import {
  type DestinationListParams,
  type DestinationListItem,
  type DestinationDetail,
  buildWhereConditions,
  buildOrderBy,
  serializeDestinationListItem,
  serializeDestinationDetail,
} from "@/lib/destinations";

interface DestinationListResult {
  data: DestinationListItem[];
  total: number;
  page: number;
  limit: number;
}

export function getDestinations(params: DestinationListParams): DestinationListResult {
  const where = buildWhereConditions(params);
  const orderBy = buildOrderBy(params.sort);
  const offset = (params.page - 1) * params.limit;

  const totalResult = db
    .select({ count: count() })
    .from(destinations)
    .where(where)
    .get();

  const total = totalResult?.count ?? 0;

  const rows = db
    .select()
    .from(destinations)
    .where(where)
    .orderBy(...orderBy)
    .limit(params.limit)
    .offset(offset)
    .all();

  return {
    data: rows.map(serializeDestinationListItem),
    total,
    page: params.page,
    limit: params.limit,
  };
}

export function getDestinationById(id: number): DestinationDetail | null {
  const row = db
    .select()
    .from(destinations)
    .where(eq(destinations.id, id))
    .get();

  if (!row) return null;

  return serializeDestinationDetail(row);
}
