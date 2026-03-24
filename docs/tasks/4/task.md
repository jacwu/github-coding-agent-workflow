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
- `travel-website/package.json` currently includes Next.js, React, Drizzle ORM, and SQLite dependencies, but no authentication or password-hashing packages yet.
- `travel-website/src/db/schema.ts` already defines the `users` table with `email` as a unique field and `passwordHash` as a required stored hash, which is sufficient for local credentials-based authentication.
- `travel-website/src/db/index.ts` already provides a shared Drizzle database instance suitable for auth lookups and user creation.
- `travel-website/src/lib/` currently contains only `utils.ts`; there is no auth configuration module yet.
- `travel-website/src/app/` currently contains only the root layout and page. The auth API routes described in `docs/design.md` do not exist yet.
- Vitest is already configured for unit testing, and existing tests in `src/db/index.test.ts` show the current testing style for server-side modules.

## Proposed Design

### 1. Dependencies

Add only the dependencies required for local credentials authentication:

- `next-auth` — authentication framework integration for Next.js App Router
- `bcryptjs` — password hashing and verification for user credentials

Design notes:

- `bcryptjs` is preferred over native `bcrypt` to avoid native build requirements in the sandbox and CI environment while still providing a standard password hashing workflow.
- No database adapter is required for this task because the repository-wide design uses JWT sessions and local credential checks against the existing Drizzle-managed `users` table.

### 2. Authentication module

Create a dedicated server auth module at:

- `travel-website/src/lib/auth.ts`

Responsibilities:

- define the NextAuth configuration
- configure the Credentials Provider for email/password login
- expose reusable helpers for route handlers and server components
- centralize session and JWT callbacks

Planned structure:

1. Import NextAuth and `Credentials` provider.
2. Query the `users` table through the shared Drizzle `db` instance.
3. Compare the submitted password with the stored `passwordHash` using `bcryptjs.compare`.
4. Return a minimal authenticated user object on success:
   - `id`
   - `email`
   - `name`
5. Reject invalid credentials by returning `null` from the provider's `authorize` function.

Session strategy:

- Use `session: { strategy: "jwt" }` to match `docs/design.md`.
- Store the database user ID in the JWT during the `jwt` callback.
- Copy the user ID onto `session.user.id` during the `session` callback so later APIs can identify the current user.

Because later tasks will need a consistent authenticated user shape, the auth module should export the shared NextAuth handlers and helper functions from one place instead of spreading auth logic across route files.

### 3. NextAuth route handler

Add the App Router auth endpoint described in the repository design:

- `travel-website/src/app/api/auth/[...nextauth]/route.ts`

Design:

- Re-export the HTTP handlers produced by the shared auth module.
- Keep the route file thin so the core auth logic remains easy to test in `src/lib/auth.ts`.

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

1. Parse JSON from the request body.
2. Validate required fields:
   - `email` must be present and formatted like an email address
   - `password` must be present and non-empty
   - `name` must be present and non-empty
3. Normalize email input before persistence:
   - trim surrounding whitespace
   - convert to lowercase
4. Check whether a user with the normalized email already exists.
5. Hash the submitted password with `bcryptjs.hash` before writing to the database.
6. Insert the new user into the `users` table.
7. Return only non-sensitive fields in the response.

Response behavior:

- `201` for successful registration
- `400` for invalid request payloads
- `409` when the email is already registered

Security requirements:

- Never store or return the raw password.
- Never return `passwordHash` in API responses.
- Use a generic invalid-credentials response in login flows so the system does not reveal whether an email exists.
- Perform validation before hashing to avoid unnecessary CPU work on clearly invalid requests.

### 5. Validation and domain boundaries

Task 4 should keep validation localized to authentication boundaries rather than creating broad new infrastructure.

Recommended validation scope:

- Registration route validates request payload shape and basic field constraints.
- Credentials `authorize` validates that both email and password are present before querying the database.

Minimal validation rules for this task:

- `email`: required, trimmed, lowercase-normalized, basic email format check
- `password`: required, non-empty string
- `name`: required, non-empty trimmed string

This keeps the task aligned with the issue goal while leaving stricter password policy and richer error messaging as future enhancements if needed.

### 6. Session and type shape

Later protected routes will need the logged-in user's database ID directly from the session. The default NextAuth types do not include that field, so Task 4 should extend the session/JWT type shape to include `user.id`.

Recommended type addition:

- `travel-website/src/types/next-auth.d.ts`

Type goals:

- `session.user.id` is always available when a session exists
- the JWT token also carries `id` so the session callback can populate it

This prevents repeated type assertions in later tasks and keeps server-side auth code compatible with strict TypeScript settings.

### 7. Environment and configuration expectations

Task 4 should introduce the auth-related environment variables required by NextAuth.

Expected configuration:

- `AUTH_SECRET` or `NEXTAUTH_SECRET` for JWT/session signing

Documentation update scope during implementation:

- extend `.env.example` with the auth secret variable
- avoid committing any real secret values

This is directly related to the auth foundation and should be documented wherever the project currently documents required environment variables.

### 8. Error handling strategy

Auth code should follow the repository convention of handling errors at system boundaries.

Concretely:

- the registration route returns structured HTTP responses for validation and conflict errors
- the credentials provider returns `null` for invalid login attempts instead of throwing application-level errors for expected failures
- unexpected database or runtime failures may surface as server errors from the route boundary, but internal helpers should avoid unnecessary `try/catch` wrapping

This keeps the implementation small, testable, and consistent with the repository coding standards.

### 9. Testing strategy

Implementation should follow TDD and add focused server-side tests only for the new auth foundation.

Recommended test areas:

1. **Registration route**
   - creates a new user with a hashed password
   - rejects missing or malformed input with `400`
   - rejects duplicate emails with `409`
   - does not expose `passwordHash` in the response

2. **Auth module / credentials flow**
   - authorizes a user with a valid email/password combination
   - rejects unknown email
   - rejects wrong password
   - normalizes email consistently for login

3. **Session callbacks**
   - persist the database user ID into the JWT
   - expose the database user ID on `session.user.id`

Tests should be co-located with the new server modules and use the existing Vitest setup. Authentication tests should use an isolated database context or deterministic test doubles so they do not depend on a shared on-disk database.

## Implementation Plan

1. Add the minimal runtime dependencies for authentication: `next-auth` and `bcryptjs`.
2. Create `travel-website/src/lib/auth.ts` with the shared NextAuth configuration, Credentials Provider, and JWT/session callbacks.
3. Add `travel-website/src/app/api/auth/[...nextauth]/route.ts` to expose the NextAuth handlers through the App Router.
4. Add `travel-website/src/app/api/auth/register/route.ts` to validate input, normalize email, hash the password, insert the user, and return a sanitized response.
5. Add NextAuth type augmentation so authenticated sessions expose the database user ID in a type-safe way.
6. Update environment variable documentation directly related to auth setup (for example `.env.example`) with the required auth secret placeholder.
7. Write failing auth-focused unit tests first, then implement the minimal code required to make them pass.
8. Validate the implementation with targeted auth tests, then run the repository lint, build, and full test commands to ensure the new authentication foundation does not break existing behavior.
