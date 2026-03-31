# Build Authentication Foundation

## Background

`docs/requirements.md` defines the first product area as account registration and secure login/logout so users can access personalized features. `docs/design.md` further specifies NextAuth.js with a Credentials provider, a `POST /api/auth/register` endpoint, and authenticated access to user-specific trip data.

The preceding infrastructure tasks have already established the prerequisites this issue should build on:

- `travel-website/` is a working Next.js 16.2.1 App Router application with strict TypeScript.
- SQLite + Drizzle ORM are configured and available through `src/db/index.ts`.
- The `users` table already exists in `src/db/schema.ts` with the fields required for credentials-based auth (`email`, `password_hash`, `name`).

Issue #67 should therefore focus on the backend authentication foundation only: wiring NextAuth into the app, defining how email/password sign-in works against the existing `users` table, and exposing a registration API that safely creates new users for later UI flows.

## Goal

Establish the application's authentication backend so later tasks can implement protected pages and authenticated UI flows on top of it.

This issue should deliver:

- NextAuth integration for the App Router
- email/password login using the existing `users` table
- a registration endpoint at `POST /api/auth/register`
- a reusable server-side auth helper that future pages and API routes can call to identify the current user
- session data that includes the authenticated user ID for user-scoped queries

## Non-Goals

- building the `/login` and `/register` page UIs
- adding navigation bar login state or logout buttons
- introducing OAuth/social providers
- implementing profile editing, password reset, email verification, or avatar upload
- adding middleware-based route protection across the app
- redesigning the existing database schema beyond small auth-coupled adjustments if absolutely required

## Current State

Verified against the current repository:

- `docs/design.md` expects:
  - `Authentication | NextAuth.js (Credentials Provider)`
  - `POST /api/auth/register`
  - `POST /api/auth/[...nextauth]`
  - protected trip routes that depend on authentication
- `travel-website/package.json` does **not** currently include `next-auth`, `@auth/core`, or a password-hashing library such as `bcryptjs`.
- `travel-website/src/lib/` currently contains only `utils.ts`; there is no existing auth configuration module.
- The entire `travel-website/src/app/api/` directory does **not** exist yet — there are no API routes of any kind. The `src/app/` directory currently contains only `layout.tsx`, `page.tsx`, `globals.css`, and `favicon.ico`.
- The `travel-website/src/types/` directory does **not** exist yet.
- `travel-website/src/db/schema.ts` already defines a `users` table with:
  - unique `email`
  - `passwordHash`
  - `name`
  - optional `avatarUrl`
- `travel-website/src/db/index.ts` exports a shared Drizzle client, enables SQLite foreign keys, and imports `server-only` — meaning it cannot be imported in client components or directly in Vitest test files (see Testing strategy below).
- `.env.example` currently contains only `DATABASE_URL=file:./sqlite.db`.

This means the remaining gap is not schema work, but the application-layer authentication flow that consumes the existing schema safely and consistently.

## Proposed Design

### 1. Authentication approach

Use **NextAuth.js v5 with the Credentials provider** and **JWT-based sessions**.

NextAuth v5 is the version that provides first-class support for the Next.js App Router pattern and is compatible with Next.js 16 and React 19 as used in this project. It exports `NextAuth()` from `next-auth` (not from `next-auth/react`), which returns:

- `handlers` — `{ GET, POST }` for the catch-all API route
- `auth` — async function to retrieve the session on the server
- `signIn` — server-side sign-in helper
- `signOut` — server-side sign-out helper

from a shared `src/lib/auth.ts` module.

This is the best fit for the current application state because:

- the app already has its own `users` table with password hashes
- credentials login does not require introducing external OAuth configuration
- JWT sessions avoid adding a separate NextAuth adapter/session table before it is needed
- future server components and API routes can call `auth()` directly to access the current user

### 2. File and module layout

The auth foundation should be implemented with the following file responsibilities:

```text
travel-website/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── auth/
│   │           ├── [...nextauth]/route.ts
│   │           └── register/route.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── auth-service.ts
│   │   └── auth-validation.ts
│   └── types/
│       └── next-auth.d.ts
```

Note: Both `src/app/api/` and `src/types/` are new directories that must be created as part of this task.

Recommended responsibilities:

- **`src/lib/auth.ts`**
  - owns the NextAuth v5 configuration via `NextAuth({ ... })`
  - defines the Credentials provider
  - exports `handlers`, `auth`, `signIn`, and `signOut`
  - defines JWT/session callbacks so `session.user.id` is available server-side
  - sets `trustHost: true` so the app works in development and test environments without requiring explicit `NEXTAUTH_URL`

- **`src/lib/auth-service.ts`**
  - contains pure server-side auth operations against the database
  - examples:
    - `findUserByEmail(email)`
    - `verifyPasswordLogin(email, password)`
    - `createUser(input)`
  - centralizes DB reads/writes so the NextAuth config and registration route do not duplicate logic
  - imports `db` from `@/db` for production use; tests provide their own DB instance (see Testing strategy)

- **`src/lib/auth-validation.ts`**
  - validates and normalizes auth payloads
  - keeps request validation separate from route handlers and DB access
  - must be a pure module with no database or `server-only` imports so it is easily testable in Vitest

- **`src/app/api/auth/[...nextauth]/route.ts`**
  - re-exports `GET` and `POST` from `handlers`

- **`src/app/api/auth/register/route.ts`**
  - handles user registration only
  - returns safe user fields, never password hashes

- **`src/types/next-auth.d.ts`**
  - augments NextAuth `Session`/`User`/`JWT` types so the authenticated user ID (`string`) is typed throughout the app

The exact helper filenames can be adjusted during implementation, but the design should preserve a clear split between:

1. NextAuth wiring
2. validation
3. database-backed auth operations

### 3. Dependency additions

Add the minimal runtime and type dependencies needed for credentials auth:

| Package | Category | Purpose |
|---|---|---|
| `next-auth` (v5) | dependency | NextAuth integration for App Router |
| `bcryptjs` | dependency | password hashing and comparison |
| `@types/bcryptjs` | devDependency | TypeScript type definitions for bcryptjs (required by strict mode) |

No adapter package is required in this issue because the design uses JWT sessions rather than database-backed NextAuth sessions.

### 4. Credentials login flow

The Credentials provider should authenticate using the existing `users` table.

#### Input

The provider accepts:

- `email`
- `password`

#### Authorize flow

1. Normalize the submitted email (`trim` + lowercase).
2. Validate that both email and password are present and within allowed bounds.
3. Query the user by email from the `users` table.
4. Compare the submitted password against `users.passwordHash` using `bcryptjs.compare`.
5. If valid, return a safe user object containing only:
   - `id` (as a string, since NextAuth v5 `User.id` is `string`)
   - `email`
   - `name`
   - optionally `image` if mapped from `avatarUrl`
6. If invalid, return `null` so NextAuth rejects the login.

#### Session shape

Because protected pages and APIs will need the database user ID, the JWT and session callbacks should persist it:

- in the `jwt` callback: on initial sign-in, set `token.sub` from the user ID (converted to string)
- in the `session` callback: copy `token.sub` to `session.user.id`

This gives future code a stable pattern:

```typescript
const session = await auth();
session?.user?.id; // string — the database user ID
```

### 5. Registration endpoint design

Implement `POST /api/auth/register` as a standalone API route rather than making registration part of the NextAuth callback flow.

This matches `docs/design.md` and keeps registration behavior explicit and testable.

#### Request body

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "Alice"
}
```

#### Validation rules

The route should validate at least:

- `email` must be a syntactically valid email address
- `email` should be normalized to lowercase
- `password` must meet a minimum length requirement
- `password` should have a reasonable maximum length to avoid abusive payloads
- `name` must be present and trimmed
- all fields should reject empty-string inputs after trimming

Recommended initial bounds:

- `email`: non-empty, valid format, max 254 characters
- `password`: min 8 characters, max 72 characters (bcrypt truncates beyond 72 bytes)
- `name`: min 1 character after trim, max 100 characters

#### Behavior

1. Parse and validate the JSON body.
2. Normalize `email` and `name`.
3. Hash the password with `bcryptjs.hash` using a standard work factor (e.g. 12).
4. Insert the user into the `users` table.
5. Return `201 Created` with only safe user fields:

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Alice"
}
```

#### Error handling

Use explicit API responses at the route boundary with a consistent JSON error shape:

```json
{ "error": "Human-readable error message" }
```

Status codes:

- `400` for malformed JSON or missing required fields
- `422` for structurally valid JSON that fails field validation (e.g. invalid email format, password too short)
- `409` when the email already exists
- `500` only for unexpected failures

If a unique-email race occurs during insert, the route should map the DB constraint failure to `409` instead of leaking a raw database error.

### 6. Security expectations

Because this issue introduces credential handling, the design must explicitly preserve the following security properties:

- never store plaintext passwords
- never return `passwordHash` in any response
- use bcrypt hashing, not reversible encryption
- keep login failures generic so the sign-in flow does not reveal whether an email exists
- normalize email before lookup and insert to avoid duplicate-account edge cases caused by casing differences
- validate input length bounds to reduce abuse and accidental oversized payloads
- require `AUTH_SECRET` for NextAuth session signing

An `.env.example` update should document the auth secret requirement alongside the existing database configuration:

```env
DATABASE_URL=file:./sqlite.db
AUTH_SECRET=replace-with-a-long-random-secret
```

Note: The existing build command (`npm run build`) will require `AUTH_SECRET` to be set in the environment (e.g. `AUTH_SECRET=test-secret npm run build`) once NextAuth is integrated.

### 7. Relationship to future tasks

This issue should provide the backend foundation that later tasks consume:

- Login/register page tasks can build `/login` and `/register` pages on top of:
  - `POST /api/auth/register`
  - `signIn("credentials", ...)`
  - `signOut()`
- Trip API/page tasks can protect trip endpoints and pages via `await auth()`
- the navigation bar can later render user state from the same session object

To keep this issue narrowly scoped, it should **not** yet configure custom auth pages such as `pages: { signIn: "/login" }` in the NextAuth config. Without custom pages configured, NextAuth v5 serves a built-in sign-in page at `/api/auth/signin`. This is acceptable for the current scope — the custom login page will be wired in by a later task once the page route exists.

### 8. Testing strategy

Implementation should follow TDD and add focused backend tests for the new auth foundation.

#### Testing infrastructure notes

The existing test pattern in this repository (see `src/db/schema.test.ts`) uses in-memory SQLite databases (`:memory:`) created per test suite for full isolation. Auth-service tests should follow this same pattern.

Because `src/db/index.ts` imports the `server-only` package (which throws when imported outside a server context), test files **cannot** directly import the production `db` instance. Instead:

- **`auth-validation.ts` tests** require no database — they test pure validation logic.
- **`auth-service.ts` tests** should create their own in-memory Drizzle database (matching the pattern in `schema.test.ts`) and pass it to service functions via dependency injection or by structuring the service module to accept a `db` parameter in its functions.
- **Route handler tests** should unit-test the underlying service/validation functions rather than instantiating full Next.js request/response cycles. If route-level integration tests are needed, mock the database module.

#### Recommended coverage

1. **Validation tests** (`src/lib/auth-validation.test.ts`)
   - registration payload validation accepts normalized valid input
   - invalid email, short password, empty name, and oversized fields are rejected
   - email normalization (trim + lowercase) works correctly

2. **Auth-service tests** (`src/lib/auth-service.test.ts`)
   - `createUser` hashes the password (stored value differs from plaintext)
   - `createUser` returns only safe user fields (no `passwordHash`)
   - `createUser` rejects duplicate emails
   - `findUserByEmail` returns the user or `null`
   - `verifyPasswordLogin` succeeds with correct credentials
   - `verifyPasswordLogin` returns `null` for unknown email
   - `verifyPasswordLogin` returns `null` for wrong password
   - mixed-case email lookup succeeds after normalization

3. **Registration route tests** (`src/app/api/auth/register/route.test.ts`)
   - successful registration returns `201` and safe user fields only
   - duplicate email returns `409`
   - invalid payload returns `400` or `422`

4. **Session callback tests** (`src/lib/auth.test.ts`)
   - JWT callback sets `token.sub` from user ID on sign-in
   - session callback copies `token.sub` to `session.user.id`

These tests should be co-located with the auth modules using the repository's existing Vitest conventions (`src/**/*.test.ts` pattern, `@/*` path alias).

## Implementation Plan

1. Install dependencies: add `next-auth` (v5) and `bcryptjs` as dependencies, `@types/bcryptjs` as a devDependency in `travel-website/package.json`. Run `npm install` to keep `package-lock.json` in sync.
2. Update `travel-website/.env.example` to document the `AUTH_SECRET` variable alongside `DATABASE_URL`.
3. Create `src/types/next-auth.d.ts` to augment `Session`, `User`, and `JWT` types with user `id`.
4. Create `src/lib/auth-validation.ts` — write validation tests first (`auth-validation.test.ts`), then implement the validation and normalization logic.
5. Create `src/lib/auth-service.ts` — write service tests first (`auth-service.test.ts`) using in-memory SQLite (matching the `schema.test.ts` pattern), then implement `findUserByEmail`, `verifyPasswordLogin`, and `createUser`.
6. Create `src/lib/auth.ts` with the NextAuth v5 Credentials provider, JWT session strategy, `trustHost: true`, and callbacks that expose `session.user.id`. Write session callback tests (`auth.test.ts`).
7. Create the directory structure `src/app/api/auth/[...nextauth]/` and add `route.ts` that re-exports `GET` and `POST` from `handlers`.
8. Create `src/app/api/auth/register/route.ts` that validates input, hashes passwords, inserts the user, and returns safe user fields with correct status codes. Write route-level tests (`route.test.ts`).
9. Run all targeted auth tests, then run the full test suite (`npm run test`), linter (`npm run lint`), and build (`AUTH_SECRET=test-secret npm run build`) to verify nothing is broken.
