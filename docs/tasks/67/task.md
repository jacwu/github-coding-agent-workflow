# Build Authentication Foundation

## Background

`docs/requirements.md` defines the first product area as account registration and secure login/logout so users can access personalized features. `docs/design.md` further specifies NextAuth.js with a Credentials provider, a `POST /api/auth/register` endpoint, and authenticated access to user-specific trip data.

The preceding infrastructure tasks have already established the prerequisites this issue should build on:

- `travel-website/` is a working Next.js App Router application with strict TypeScript.
- SQLite + Drizzle ORM are configured and available through `src/db/index.ts`.
- The `users` table already exists in `src/db/schema.ts` with the fields required for credentials-based auth (`email`, `password_hash`, `name`).

Issue #67 should therefore focus on the backend authentication foundation only: wiring NextAuth into the app, defining how email/password sign-in works against the existing `users` table, and exposing a registration API that safely creates new users for later UI flows.

## Goal

Establish the application’s authentication backend so later tasks can implement protected pages and authenticated UI flows on top of it.

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
- `travel-website/package.json` does **not** currently include `next-auth` or a password-hashing library.
- `travel-website/src/lib/` currently contains only `utils.ts`; there is no existing auth configuration module.
- `travel-website/src/app/` currently has no `(auth)` pages and no `api/auth/` routes yet.
- `travel-website/src/db/schema.ts` already defines a `users` table with:
  - unique `email`
  - `passwordHash`
  - `name`
  - optional `avatarUrl`
- `travel-website/src/db/index.ts` already exports a shared Drizzle client and enables SQLite foreign keys.

This means the remaining gap is not schema work, but the application-layer authentication flow that consumes the existing schema safely and consistently.

## Proposed Design

### 1. Authentication approach

Use **NextAuth.js with the Credentials provider** and **JWT-based sessions**.

This is the best fit for the current application state because:

- the app already has its own `users` table with password hashes
- credentials login does not require introducing external OAuth configuration
- JWT sessions avoid adding a separate NextAuth adapter/session table before it is needed
- future server components and API routes can call `auth()` directly to access the current user

The implementation should use the NextAuth App Router pattern that exports:

- `handlers`
- `auth`
- `signIn`
- `signOut`

from a shared `src/lib/auth.ts` module.

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

Recommended responsibilities:

- **`src/lib/auth.ts`**
  - owns the NextAuth configuration
  - defines the Credentials provider
  - exports `handlers`, `auth`, `signIn`, and `signOut`
  - defines JWT/session callbacks so `session.user.id` is available server-side

- **`src/lib/auth-service.ts`**
  - contains pure server-side auth operations against the database
  - examples:
    - `findUserByEmail(email)`
    - `verifyPasswordLogin(email, password)`
    - `createUser(input)`
  - centralizes DB reads/writes so the NextAuth config and registration route do not duplicate logic

- **`src/lib/auth-validation.ts`**
  - validates and normalizes auth payloads
  - keeps request validation separate from route handlers and DB access

- **`src/app/api/auth/[...nextauth]/route.ts`**
  - re-exports `GET` and `POST` from `handlers`

- **`src/app/api/auth/register/route.ts`**
  - handles user registration only
  - returns safe user fields, never password hashes

- **`src/types/next-auth.d.ts`**
  - augments NextAuth `Session`/`User`/`JWT` types so the authenticated user ID is typed throughout the app

The exact helper filenames can be adjusted during implementation, but the design should preserve a clear split between:

1. NextAuth wiring
2. validation
3. database-backed auth operations

### 3. Dependency additions

Add the minimal runtime dependencies needed for credentials auth:

| Package | Purpose |
|---|---|
| `next-auth` | NextAuth integration for App Router |
| `bcryptjs` | password hashing and comparison |

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
   - `id`
   - `email`
   - `name`
   - optionally `image` if mapped from `avatarUrl`
6. If invalid, return `null` so NextAuth rejects the login.

#### Session shape

Because protected pages and APIs will need the database user ID, the JWT and session callbacks should persist it:

- on sign-in, set `token.sub` or `token.userId` from the database user ID
- on session creation, copy that value to `session.user.id`

This gives future code a stable pattern:

- `const session = await auth()`
- `session?.user?.id`

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
- `password`: min 8 characters, max 72 characters
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

Use explicit API responses at the route boundary:

- `400` for malformed JSON or missing required fields
- `422` for structurally valid JSON that fails field validation
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

An `.env.example` update should document the auth secret requirement alongside the existing database configuration, for example:

```env
DATABASE_URL=file:./sqlite.db
AUTH_SECRET=replace-with-a-long-random-secret
```

### 7. Relationship to future tasks

This issue should provide the backend foundation that later tasks consume:

- **Task 5** can build `/login` and `/register` pages on top of:
  - `POST /api/auth/register`
  - `signIn("credentials", ...)`
  - `signOut()`
- **Task 9 / Task 10** can protect trip APIs and pages via `await auth()`
- the navigation bar can later render user state from the same session object

To keep this issue narrowly scoped, it should **not** yet configure custom auth pages such as `pages.signIn = "/login"` unless the corresponding route exists. Until the login page task lands, the backend should remain usable by API consumers and future UI work without assuming the custom page is already present.

### 8. Testing strategy

Implementation should follow TDD and add focused backend tests for the new auth foundation.

Recommended coverage:

1. **Validation tests**
   - registration payload validation accepts normalized valid input
   - invalid email, short password, empty name, and oversized fields are rejected

2. **Registration route tests**
   - successful registration returns `201` and safe user fields only
   - duplicate email returns `409`
   - invalid payload returns `422`
   - stored password is hashed rather than plaintext

3. **Credentials authorize tests**
   - valid email/password returns a safe user object
   - unknown email returns `null`
   - wrong password returns `null`
   - mixed-case email login succeeds after normalization

4. **Session callback tests**
   - authenticated user ID is copied into the JWT/session shape used by the app

These tests should be co-located with the auth modules using the repository’s existing Vitest conventions.

## Implementation Plan

1. Add `next-auth` and `bcryptjs` to `travel-website/package.json` and keep `package-lock.json` in sync.
2. Add or update environment documentation so `AUTH_SECRET` is documented next to `DATABASE_URL`.
3. Create `src/lib/auth-validation.ts` with reusable input normalization and validation for login/registration payloads.
4. Create `src/lib/auth-service.ts` with database-backed helpers for user lookup, password verification, and user creation.
5. Create `src/lib/auth.ts` with the NextAuth Credentials provider, JWT session strategy, and callbacks that expose `session.user.id`.
6. Create `src/app/api/auth/[...nextauth]/route.ts` that re-exports the NextAuth handlers.
7. Create `src/app/api/auth/register/route.ts` that validates input, hashes passwords, inserts the user, and returns safe user fields with correct status codes.
8. Add `src/types/next-auth.d.ts` so `session.user.id` and the credential-login user shape are properly typed.
9. Write focused Vitest coverage for validation, registration, authorize behavior, and session shaping before implementing the final logic.
10. Validate with targeted auth tests first, then run the repository auth-related build/lint/test commands before considering the task complete.
