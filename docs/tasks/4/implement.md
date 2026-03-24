# Task 4: Build Authentication Foundation — Implementation Summary

## Changes

### Dependencies Added
- `next-auth@5.0.0-beta.30` — Auth.js v5 for NextAuth integration (installed with `--legacy-peer-deps` for Next.js 16 compat)
- `bcryptjs@3.0.3` — password hashing/verification
- `@types/bcryptjs` — TypeScript types (dev dependency)

### New Files

| File | Purpose |
|------|---------|
| `src/types/next-auth.d.ts` | Module augmentation for Auth.js v5 Session and JWT types, adding `session.user.id` and `token.id` |
| `src/lib/auth.ts` | Shared NextAuth config — Credentials Provider, JWT/session callbacks, exports `{ handlers, auth, signIn, signOut }` |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth catch-all route handler (re-exports GET/POST from auth module) |
| `src/app/api/auth/register/route.ts` | Registration endpoint: validates input, normalizes email, hashes password, inserts user, returns sanitized response |
| `src/lib/auth.test.ts` | 13 tests: authorize flow (valid/invalid credentials, email normalization, ID as string), session callbacks (jwt/session), configuration (JWT strategy, signIn page, trustHost) |
| `src/app/api/auth/register/route.test.ts` | 13 tests: success (201), bcrypt hash storage, missing fields (400), short password (400), invalid email (400), duplicate email (409), email normalization, name trimming, malformed JSON, case-insensitive duplicate detection |

### Modified Files

| File | Change |
|------|--------|
| `.env.example` | Added `AUTH_SECRET=<generate-a-random-secret>` placeholder |
| `package.json` | Added runtime deps (`next-auth`, `bcryptjs`) and dev dep (`@types/bcryptjs`) |
| `package-lock.json` | Updated lockfile |

## Validation

| Check | Result |
|-------|--------|
| `npm test` | 47 tests passed (21 existing + 26 new) |
| `npm run lint` | Clean |
| `npm run build` | Successful (with AUTH_SECRET env var) |
| Security advisory check | No vulnerabilities in new dependencies |

## Open Items

None — all items from the task document are complete.

## Revision Update

### Review Conclusion
- The original Task 4 implementation already covered the required auth foundation, so this revision focused on targeted hardening and design-alignment rather than feature expansion.

### Targeted Revisions
- Hardened `src/app/api/auth/register/route.ts` so a duplicate-email unique-constraint failure during insert is returned as `409 { "error": "Email already registered" }` instead of falling through to a generic `500`. This closes the race-condition gap between the duplicate pre-check and the actual insert.
- Updated `src/types/next-auth.d.ts` to augment `next-auth/jwt` and to compose `Session.user` with `DefaultSession["user"]`, matching the Task 4 design document more closely for future typed auth usage.
- Added a focused regression test in `src/app/api/auth/register/route.test.ts` covering the insert-time duplicate-email path.

### Affected Files
- `travel-website/src/app/api/auth/register/route.ts`
- `travel-website/src/app/api/auth/register/route.test.ts`
- `travel-website/src/types/next-auth.d.ts`

### Revision Validation
- `npm test -- src/app/api/auth/register/route.test.ts` ✅
- `npm run lint` ✅
- `AUTH_SECRET=test-secret npm run build` ✅
- `npm test` ✅ (48 tests passed)

### Remaining Items
- None.
