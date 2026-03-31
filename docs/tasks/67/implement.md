# Build Authentication Foundation — Implementation Summary

## Issue Number: 67

## Changes

### Dependencies Added
- `next-auth@5.0.0-beta.30` — NextAuth v5 with App Router support
- `bcryptjs@3.0.3` — password hashing and comparison
- `@types/bcryptjs` (devDependency) — TypeScript definitions for bcryptjs

### New Files

| File | Purpose |
|---|---|
| `src/types/next-auth.d.ts` | Augments `Session`, `User`, and `JWT` types so `session.user.id` is typed as `string` |
| `src/lib/auth-validation.ts` | Pure validation and normalization for registration payloads (email format, password length, name bounds) |
| `src/lib/auth-validation.test.ts` | 16 tests covering valid input, email normalization, and all rejection cases |
| `src/lib/auth-service.ts` | DB-backed auth operations: `createUser`, `findUserByEmail`, `verifyPasswordLogin`; accepts injected DB for testability |
| `src/lib/auth-service.test.ts` | 10 tests using in-memory SQLite: password hashing, duplicate rejection, login verify, case-insensitive lookup |
| `src/lib/auth.ts` | NextAuth v5 config with Credentials provider, JWT session strategy, `trustHost: true`, and callbacks that expose `session.user.id` |
| `src/lib/auth.test.ts` | 3 tests for JWT and session callback logic |
| `src/app/api/auth/[...nextauth]/route.ts` | Re-exports `GET` and `POST` handlers from NextAuth |
| `src/app/api/auth/register/route.ts` | Registration endpoint: validates input, hashes password, inserts user, returns safe fields |
| `src/app/api/auth/register/route.test.ts` | 6 tests: successful 201 response, 409 duplicate, 422 validation errors, 400 invalid JSON |

### Modified Files

| File | Change |
|---|---|
| `.env.example` | Added `AUTH_SECRET=replace-with-a-long-random-secret` |
| `package.json` | Added `next-auth`, `bcryptjs`, `@types/bcryptjs` |
| `package-lock.json` | Updated with new dependency tree |

## Validation

| Check | Result |
|---|---|
| `npm run test` | 66 tests across 6 files — all passing |
| `npm run lint` | Clean — no warnings or errors |
| `AUTH_SECRET=test-secret npm run build` | Succeeds — routes `/api/auth/[...nextauth]` and `/api/auth/register` registered |
| Code review | No issues found |
| CodeQL security scan | 0 alerts |

## Security Properties

- Passwords hashed with bcrypt (12 rounds), never stored as plaintext
- `passwordHash` never returned in any API response
- Login failures return generic `null` — no email existence leak
- Email normalized (trim + lowercase) before all lookups and inserts
- Input length bounds enforced (email ≤254, password 8–72, name ≤100)
- `AUTH_SECRET` required for JWT session signing
- Unique constraint race on duplicate email mapped to 409 response

## Open Items

None — all requirements from `docs/tasks/67/task.md` are fulfilled.

## Revision Summary — 2026-03-31

### Review Conclusion

The authentication foundation already satisfied the main issue requirements, so this revision stayed intentionally small and focused on two edge-case hardening improvements in the existing implementation.

### Targeted Revisions

1. **Hardened credentials login input handling**
   - Added `validateLoginCredentials()` in `travel-website/src/lib/auth-validation.ts`.
   - Updated `travel-website/src/lib/auth.ts` to validate `credentials?.email` and `credentials?.password` safely before accessing them.
   - This prevents the Credentials provider from throwing if NextAuth calls `authorize()` with a missing or malformed credentials object, and it now rejects invalid email / out-of-bounds password input consistently.

2. **Enforced normalization at the service boundary**
   - Updated `travel-website/src/lib/auth-service.ts` so `createUser()` now normalizes email and trims name before insert.
   - This keeps the normalization invariant inside the auth service rather than relying entirely on upstream route callers, reducing the risk of mixed-case duplicate-account edge cases if the service is reused directly in future tasks.

### Tests Added/Updated

- `travel-website/src/lib/auth-validation.test.ts`
  - Added focused tests for `validateLoginCredentials()` covering:
    - valid normalized credentials
    - missing credentials fields
    - invalid email / short password / oversized password rejection
- `travel-website/src/lib/auth-service.test.ts`
  - Added a test proving `createUser()` stores normalized email and trimmed name

### Validation

| Check | Result |
|---|---|
| `npm run test -- src/lib/auth-validation.test.ts src/lib/auth-service.test.ts` | Passing — 30 targeted auth tests |
| `npm run lint` | Passing |
| `AUTH_SECRET=test-secret npm run build` | Passing |
| `npm run test` | Passing — 68 tests across 6 files |

### Remaining Items

None.
