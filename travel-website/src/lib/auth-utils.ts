/**
 * Shared authentication utility functions.
 */

/**
 * Sanitize a callback URL to prevent open redirect attacks.
 *
 * Returns the URL if it starts with `/` and does not start with `//`
 * (which would be a protocol-relative URL). Returns `/` for any other
 * input (null, empty, absolute URLs, `//`-prefixed values).
 */
export function sanitizeCallbackUrl(
  url: string | null | undefined
): string {
  if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  return "/";
}
