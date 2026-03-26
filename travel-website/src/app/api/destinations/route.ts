import { NextResponse } from "next/server";
import { count } from "drizzle-orm";

import { db } from "@/db";
import { destinations } from "@/db/schema";
import {
  parseListParams,
  buildWhereConditions,
  buildOrderBy,
  serializeDestinationListItem,
  isValidationError,
} from "@/lib/destinations";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const params = parseListParams(searchParams);

    if (isValidationError(params)) {
      return NextResponse.json({ error: params.error }, { status: 400 });
    }

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

    return NextResponse.json({
      data: rows.map(serializeDestinationListItem),
      total,
      page: params.page,
      limit: params.limit,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
