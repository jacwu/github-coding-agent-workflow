# Task 4: Build Authentication Foundation

## Background

The product requirements define account registration and secure email/password login as the first personalized capability of the travel website. The repository-wide design already commits to NextAuth.js with a Credentials Provider, a JWT-backed session model, and a `/api/auth/register` endpoint for account creation.

Task 3 established the database prerequisites for local authentication by adding the `users` table with `email`, `password_hash`, `name`, and `created_at` fields. Task 4 should now connect those database records to an authentication flow that future pages and APIs can rely on for protected access and user-specific trip data.

## Goal

Establish the server-side authentication foundation for the application in `travel-website/` by introducing:

- NextAuth-based email/password login using the existing `users` table
- a registration API route that creates local user accounts securely
- reusable auth helpers that later tasks can use to protect pages and APIs
- a typed session shape that exposes the authenticated user's database ID

The design should stay minimal and focused on infrastructure needed by later tasks rather than building the full login/register UI.

## Non-Goals

- Building the `/login` and `/register` pages or their form UX (Task 5)
- Adding OAuth providers or social login
- Implementing protected trip APIs or page redirects (later tasks consume this foundation)
- Adding profile editing, avatar uploads, password reset, or email verification
- Changing the existing `users` table schema unless implementation uncovers a blocking issue
- Introducing a separate authentication microservice or external identity provider

## Current State

- `docs/requirements.md` requires visitor registration plus secure login/logout for authenticated users.
- `docs/design.md` specifies NextAuth.js with a Credentials Provider and JWT sessions, with `/api/auth/register` and `/api/auth/[...nextauth]` as the authentication endpoints.
- `travel-website/package.json` currently includes Next.js 16.2.1, React, Drizzle ORM, and SQLite dependencies, but no authentication or password-hashing packages yet.
- `travel-website/src/db/schema.ts` already defines the `users` table with `email` as a unique field and `passwordHash` as a required stored hash, which is sufficient for local credentials-based authentication. The `id` column is `INTEGER PRIMARY KEY AUTOINCREMENT`.
- `travel-website/src/db/index.ts` already provides a shared Drizzle database instance (with `server-only` guard) suitable for auth lookups and user creation.
- `travel-website/src/lib/` currently contains only `utils.ts`; there is no auth configuration module yet.
- `travel-website/src/types/index.ts` exists but is an empty export placeholder.
- `travel-website/src/app/` currently contains only the root layout and page. The auth API routes described in `docs/design.md` do not exist yet.
- Vitest is already configured for unit testing with `environment: "node"`, `@/` path alias, and test file pattern `src/**/*.test.ts`. Existing tests in `src/db/index.test.ts` and `src/db/schema.test.ts` show the current testing patterns: co-located test files, `vi.mock("server-only", () => ({}))` for the server-only guard, and in-memory SQLite databases for isolated schema tests.
- `.env.example` currently documents only `DATABASE_URL=./data/app.db`.

## Proposed Design

### 1. Dependencies

Add the following packages:

Runtime dependencies:

- `next-auth@5` (Auth.js v5) — authentication framework integration for Next.js App Router

Dev dependencies:

- `@types/bcryptjs` — TypeScript type definitions for bcryptjs

Conditionally add as a runtime dependency:

- `bcryptjs` — password hashing and verification for user credentials

Design notes:

- `bcryptjs` is preferred over native `bcrypt` to avoid native build requirements in the sandbox and CI environment while still providing a standard password hashing workflow.
- No database adapter is required for this task because the repository-wide design uses JWT sessions and local credential checks against the existing Drizzle-managed `users` table.
- The project uses Next.js 16.2.1. As of this writing, `next-auth@5` lists `next@"^14 || ^15"` as a peer dependency and does not yet officially include Next.js 16. Installation requires `--legacy-peer-deps` to bypass the peer dependency warning. This is a known community workaround and does not affect runtime behavior. If npm refuses to install, add an `overrides` section to `package.json`:

  ```json
  {
    "overrides": {
      "next-auth": {
        "next": "$next"
      }
    }
  }
  ```

### 2. Authentication module

Create a dedicated server auth module at:

- `travel-website/src/lib/auth.ts`

Responsibilities:

- define the NextAuth configuration using the Auth.js v5 API
- configure the Credentials Provider for email/password login
- export reusable helpers for route handlers and server components
- centralize session and JWT callbacks

Auth.js v5 API pattern:

The module calls the `NextAuth()` function and destructures the returned object:

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [ /* ... */ ],
  session: { strategy: "jwt" },
  callbacks: { /* ... */ },
});
```

Exported members:

| Export     | Purpose                                                                 |
|------------|-------------------------------------------------------------------------|
| `handlers` | `{ GET, POST }` for the catch-all route handler                        |
| `auth`     | Server-side session retrieval function for server components and routes |
| `signIn`   | Programmatic sign-in trigger (used by Task 5 login page)               |
| `signOut`  | Programmatic sign-out trigger (used by Task 5 navigation)              |

Credentials Provider `authorize` function:

1. Validate that both `email` and `password` are present non-empty strings.
2. Normalize the email (trim + lowercase).
3. Query the `users` table through the shared Drizzle `db` instance using `eq(users.email, normalizedEmail)`.
4. If no user found, return `null` (generic rejection — does not reveal whether the email exists).
5. Compare the submitted password with the stored `passwordHash` using `bcryptjs.compare`.
6. If comparison fails, return `null`.
7. On success, return a user object with `id` (as a string), `email`, and `name`.

ID type handling:

Auth.js v5 expects `user.id` to be a `string`. The SQLite `users.id` column is an `INTEGER`. The `authorize` function must convert the database integer ID to a string via `String(dbUser.id)` before returning the user object. The `jwt` and `session` callbacks will propagate this string ID.

Session strategy and callbacks:

- Use `session: { strategy: "jwt" }` to match `docs/design.md`.
- In the `jwt` callback: when the `user` parameter is present (initial sign-in), copy `user.id` onto `token.id`.
- In the `session` callback: copy `token.id` onto `session.user.id` so later APIs can identify the current user.

Additional configuration:

- Set `trustHost: true` in the NextAuth config to allow local development without explicit host configuration.
- Set `pages: { signIn: "/login" }` to point to the login page path defined in `docs/design.md` (Task 5 will create the actual page).

### 3. NextAuth route handler

Add the App Router auth endpoint described in the repository design:

- `travel-website/src/app/api/auth/[...nextauth]/route.ts`

Implementation:

```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- Destructure and re-export the `GET` and `POST` handlers from the shared auth module.
- Keep the route file thin (two lines) so the core auth logic remains easy to test in `src/lib/auth.ts`.

This route is the system boundary for sign-in, sign-out, and session retrieval requests handled by NextAuth.

### 4. Registration API route

Add the registration endpoint specified in `docs/design.md`:

- `travel-website/src/app/api/auth/register/route.ts`

Request body:

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "Alice"
}
```

Response on success (`201`):

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Alice"
}
```

Registration flow:

1. Parse JSON from the request body. Return `400` if the body is not valid JSON.
2. Validate required fields:
   - `email` must be present, a string, and formatted like an email address (basic regex check such as `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
   - `password` must be present, a string, and at least 8 characters long
   - `name` must be present, a non-empty string after trimming
3. Normalize email input before persistence:
   - trim surrounding whitespace
   - convert to lowercase
4. Normalize `name`:
   - trim surrounding whitespace
5. Check whether a user with the normalized email already exists by querying the `users` table. Return `409` if found.
6. Hash the submitted password with `bcryptjs.hash(password, 10)` (10 salt rounds, the bcryptjs default) before writing to the database.
7. Insert the new user into the `users` table using `db.insert(users).values({ email, passwordHash, name }).returning()`.
8. Return only non-sensitive fields (`id`, `email`, `name`) in the `201` response body.

Response behavior:

| Status | Condition                               | Body shape                                   |
|--------|-----------------------------------------|----------------------------------------------|
| `201`  | Successful registration                 | `{ "id": number, "email": string, "name": string }` |
| `400`  | Invalid/missing fields or malformed JSON | `{ "error": string }` with a description      |
| `409`  | Email already registered                | `{ "error": "Email already registered" }`     |

Security requirements:

- Never store or return the raw password.
- Never return `passwordHash` in API responses.
- Use a generic invalid-credentials response in login flows so the system does not reveal whether an email exists.
- Perform validation before hashing to avoid unnecessary CPU work on clearly invalid requests.
- Enforce a minimum password length of 8 characters as a basic security baseline.

### 5. Validation and domain boundaries

Task 4 should keep validation localized to authentication boundaries rather than creating broad new infrastructure.

Recommended validation scope:

- Registration route validates request payload shape and basic field constraints.
- Credentials `authorize` validates that both email and password are present before querying the database.

Validation rules for this task:

| Field      | Registration route                             | Credentials authorize                       |
|------------|-----------------------------------------------|---------------------------------------------|
| `email`    | Required, string, trimmed, lowercased, basic email format check | Required, non-empty string, trimmed, lowercased |
| `password` | Required, string, minimum 8 characters         | Required, non-empty string                   |
| `name`     | Required, non-empty string after trimming      | N/A                                         |

This keeps the task aligned with the issue goal while leaving stricter password policy (complexity rules, maximum length) and richer error messaging as future enhancements if needed.

### 6. Session and type shape

Later protected routes will need the logged-in user's database ID directly from the session. The default Auth.js v5 types do not guarantee a persistent `id` field on the session user after JWT round-trips, so Task 4 should extend the session/JWT type shape.

Add a type augmentation file at:

- `travel-website/src/types/next-auth.d.ts`

Module augmentation for Auth.js v5:

```ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
```

Type goals:

- `session.user.id` is always available as a `string` when a session exists
- the JWT token carries `id` so the session callback can populate it
- the ID is a string representation of the database integer ID (converted in `authorize`)

This prevents repeated type assertions in later tasks and keeps server-side auth code compatible with strict TypeScript settings. The `tsconfig.json` already includes `**/*.ts` so the `.d.ts` file will be automatically picked up.

### 7. Environment and configuration expectations

Task 4 should introduce the auth-related environment variable required by Auth.js v5.

Expected configuration:

- `AUTH_SECRET` — the secret used by Auth.js v5 for signing JWTs and encrypting session tokens. Auth.js v5 uses `AUTH_SECRET` by convention (not `NEXTAUTH_SECRET`).

Documentation update scope during implementation:

- Extend `.env.example` with `AUTH_SECRET=<generate-a-random-secret>` (placeholder, not a real value).
- Avoid committing any real secret values.
- For local development, generate a random value (e.g., `npx auth secret` or `openssl rand -base64 32`) and place it in `.env.local` (which is gitignored).

### 8. Error handling strategy

Auth code should follow the repository convention of handling errors at system boundaries.

Concretely:

- The registration route wraps the entire handler body in a `try/catch` block and returns structured JSON responses for validation errors (`400`), conflict errors (`409`), and unexpected errors (`500`).
- The credentials provider returns `null` for invalid login attempts instead of throwing application-level errors for expected failures (unknown email, wrong password).
- Internal pure functions (email normalization, validation) should not use `try/catch`.

This keeps the implementation small, testable, and consistent with the repository coding standards.

### 9. Testing strategy

Implementation should follow TDD and add focused server-side tests only for the new auth foundation. Tests should be co-located with the new server modules and use the existing Vitest setup.

Test file locations:

- `travel-website/src/lib/auth.test.ts` — auth module / credentials flow and session callbacks
- `travel-website/src/app/api/auth/register/route.test.ts` — registration route handler

Testing approach for route handlers:

Next.js App Router route handlers are standard exported `async` functions that accept a `Request` object and return a `Response`. Tests can invoke them directly:

```ts
import { POST } from "./route";

const response = await POST(new Request("http://localhost/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "test@example.com", password: "password123", name: "Test" }),
}));

expect(response.status).toBe(201);
const body = await response.json();
expect(body.email).toBe("test@example.com");
```

Testing approach for the auth module:

The `authorize` function is internal to the NextAuth config and not directly exported. Tests should extract the credential verification logic into a testable helper function, or test the auth behavior through the `signIn` export and mock the database layer. Given the existing codebase pattern of using in-memory SQLite for isolated tests, the preferred approach is:

1. Mock `server-only` as existing tests do: `vi.mock("server-only", () => ({}))`.
2. Mock or replace the `db` module to use an in-memory SQLite database with the schema applied.
3. Pre-insert test users with known bcrypt hashes.
4. Test the authorize logic by calling the credential verification directly.

Recommended test cases:

1. **Registration route** (`route.test.ts`)
   - creates a new user and returns `201` with `id`, `email`, `name` (no `passwordHash`)
   - stores a bcrypt hash (not the raw password) in the database
   - rejects missing `email` with `400`
   - rejects missing `password` with `400`
   - rejects missing `name` with `400`
   - rejects password shorter than 8 characters with `400`
   - rejects invalid email format with `400`
   - rejects duplicate emails with `409`
   - normalizes email to lowercase before checking and inserting
   - trims whitespace from `name`

2. **Auth module / credentials flow** (`auth.test.ts`)
   - returns a user object for valid email/password
   - returns `null` for an unknown email
   - returns `null` for a wrong password
   - normalizes email to lowercase for credential lookup
   - returns user ID as a string (not an integer)

3. **Session callbacks** (`auth.test.ts`)
   - `jwt` callback copies `user.id` onto `token.id` during initial sign-in
   - `session` callback copies `token.id` onto `session.user.id`

Database isolation for tests:

- Registration route tests should mock the `@/db` module to provide an in-memory SQLite database with the `users` table schema applied (matching the pattern established in `src/db/schema.test.ts`).
- Auth module tests should similarly mock the database import to use an isolated in-memory instance.
- Each test should get a clean database state via `beforeEach` setup (consistent with existing test structure).

## Implementation Plan

1. Install runtime dependencies (`next-auth`, `bcryptjs`) and dev dependencies (`@types/bcryptjs`). Use `--legacy-peer-deps` if needed for the `next-auth` peer dependency mismatch with Next.js 16.
2. Add `AUTH_SECRET` placeholder to `.env.example`.
3. Create `travel-website/src/types/next-auth.d.ts` with the Auth.js v5 type augmentation for `Session` and `JWT`.
4. Create `travel-website/src/lib/auth.ts` with the shared NextAuth configuration, Credentials Provider, JWT/session callbacks, and exported `{ handlers, auth, signIn, signOut }`.
5. Add `travel-website/src/app/api/auth/[...nextauth]/route.ts` to re-export the `GET` and `POST` handlers from the auth module.
6. Add `travel-website/src/app/api/auth/register/route.ts` with input validation, email normalization, password hashing, duplicate checking, and sanitized response.
7. Write co-located unit tests (`auth.test.ts` and `route.test.ts`) following TDD: write failing tests first, then implement the minimal code to make them pass.
8. Run targeted auth tests with `npm test -- src/lib/auth.test.ts src/app/api/auth/register/route.test.ts`, then run the full `npm run lint`, `npm run build`, and `npm test` suite to ensure the new authentication foundation does not break existing behavior.
