/**
 * Database utility functions.
 *
 * Extracted from the connection module so they can be tested independently
 * without triggering the "server-only" import guard.
 */

export const DEFAULT_DATABASE_URL = "file:./sqlite.db";

function isWindowsDrivePath(url: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(url);
}

function assertSupportedDatabaseUrl(url: string): void {
  if (/^[a-zA-Z]+:/.test(url) && !url.startsWith("file:") && !isWindowsDrivePath(url)) {
    throw new Error(
      `Unsupported DATABASE_URL protocol: "${url}". Only "file:" URLs or bare file paths are supported.`
    );
  }
}

export function getDatabaseUrl(databaseUrl = process.env.DATABASE_URL): string {
  const resolvedDatabaseUrl = databaseUrl ?? DEFAULT_DATABASE_URL;

  assertSupportedDatabaseUrl(resolvedDatabaseUrl);

  return resolvedDatabaseUrl;
}

export function resolveDatabasePath(url: string): string {
  assertSupportedDatabaseUrl(url);

  if (url.startsWith("file:")) {
    return url.slice("file:".length);
  }

  return url;
}
