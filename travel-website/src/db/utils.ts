/**
 * Database utility functions.
 *
 * Extracted from the connection module so they can be tested independently
 * without triggering the "server-only" import guard.
 */

export function resolveDatabasePath(url: string): string {
  if (url.startsWith("file:")) {
    return url.slice("file:".length);
  }

  if (/^[a-zA-Z]+:/.test(url)) {
    throw new Error(
      `Unsupported DATABASE_URL protocol: "${url}". Only "file:" URLs or bare file paths are supported.`
    );
  }

  return url;
}
