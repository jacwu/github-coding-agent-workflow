import { NextResponse } from "next/server";

import { db } from "@/db";
import { createUser, findUserByEmail } from "@/lib/auth-service";
import { validateRegistration } from "@/lib/auth-validation";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const { email, password, name } = body as Record<string, unknown>;
  const validation = validateRegistration({ email, password, name });

  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const existing = await findUserByEmail(db, validation.data.email);
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  try {
    const user = await createUser(db, validation.data);
    return NextResponse.json(user, { status: 201 });
  } catch (error: unknown) {
    // Handle unique constraint race condition
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
