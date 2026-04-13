import type { Session } from "next-auth";

import { auth } from "@/lib/auth";

export async function getAuthenticatedUserId(): Promise<number | null> {
  const session = (await auth()) as Session | null;
  const raw = session?.user?.id;
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isInteger(num) || num < 1) return null;
  return num;
}

export function parsePositiveInt(value: string): number | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) return null;
  return num;
}
