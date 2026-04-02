# Prepare Destination Seed Data and Image Assets

## Background

`docs/requirements.md` defines destination discovery as a core visitor experience, including destination browsing with images (US-2.1) and later search/filter features (US-2.2, US-2.3). `docs/design.md` further specifies that destination images should be sourced from Unsplash/Pexels CDN URLs during seeding, downloaded into `travel-website/public/images/destinations/`, and stored in the database as local filenames so the frontend can serve them from `/images/destinations/{filename}`.

Issue 69 covers the data-preparation foundation for that experience: organizing the initial destination catalog, implementing the seed workflow that materializes local image assets, and documenting the execution path needed to populate both the image directory and the `destinations` table.

## Goal

Create a destination seed workflow that:

- defines the initial curated destination dataset (all 30 destinations with complete field values including `description`, `latitude`, `longitude`, and CDN source URLs)
- downloads each destination image from its configured CDN URL into `travel-website/public/images/destinations/`
- stores only the local image filename in the `destinations.image` column
- can be run repeatedly in local/development environments without creating duplicate destination rows
- leaves the app ready for later destination API and UI tasks to consume locally served images
- commits the downloaded images to the repository so that clones are self-contained

## Non-Goals

- implementing destination list/detail APIs or destination browsing UI
- introducing a CMS, admin upload flow, or runtime image management
- changing the frontend image rendering strategy beyond the existing `/images/destinations/{filename}` convention
- building a general-purpose production migration framework for arbitrary destination catalog changes
- validating remote CDN ownership or replacing the configured Unsplash/Pexels sources

## Current State

Verified against the current branch for issue 69:

- `docs/design.md` already defines the intended seed behavior, including the canonical 30-destination list and the rule that the database stores local filenames rather than remote URLs.
- `travel-website/src/db/schema.ts` already includes a `destinations` table with the fields required by the seed data, including a required `image` column for the stored local filename. The table uses `autoIncrement` on `id`.
- `travel-website/public/images/destinations/` exists but currently contains only `.gitkeep`; no destination image assets have been downloaded yet.
- `travel-website/src/db/` currently contains `index.ts`, `schema.ts`, `utils.ts`, and their test files, but there is no `seed.ts` or equivalent destination seed implementation.
- **`travel-website/src/db/index.ts` imports `"server-only"`**, which prevents the `db` export from being used in a CLI script executed via `tsx`. The seed script must create its own database connection.
- `travel-website/src/db/utils.ts` exports `getDatabaseUrl()` and `resolveDatabasePath()` — these are safe to import from a CLI context (no `server-only` guard) and should be reused by the seed script for database path resolution.
- `travel-website/package.json` includes Drizzle scripts (`db:generate`, `db:migrate`, `db:push`, `db:studio`) and `tsx` as a dev dependency, but it does not currently expose a dedicated database seed command.
- `.gitignore` does not exclude files under `travel-website/public/images/destinations/`, so downloaded images will be tracked by git once committed.
- Destination APIs and pages are not present yet on this branch, so this task should prepare the data contract they will later consume rather than depend on those unfinished features.

## Proposed Design

### 1. Seed data source

Create `travel-website/src/db/destination-seed-data.ts` exporting the canonical initial destination list. Each entry must include **all** fields needed by the `destinations` table and the image download step:

- a stable numeric `id` (1–30)
- all display/data fields: `name`, `description`, `country`, `region`, `category`, `priceLevel`, `rating`, `bestSeason`, `latitude`, `longitude`
- image metadata: `sourceUrl` (the full Unsplash/Pexels CDN URL with size/quality parameters, e.g. `?w=800&q=80`), `filename` (e.g. `bali.jpg`)

The `description`, `latitude`, and `longitude` fields must be populated with meaningful values directly in this module — not left empty or deferred. Each description should be a brief 1–2 sentence travel-oriented blurb.

The 30 destinations and filenames follow the catalog in `docs/design.md` §6.1. This seed module becomes the single source of truth for both database rows and downloaded image filenames.

Using stable explicit IDs (1–30) makes the seed process repeatable. SQLite allows inserting explicit values for AUTOINCREMENT columns; the internal sequence counter advances past the highest inserted value, so later non-seed inserts will not collide.

### 2. Seed script — standalone database connection

Create `travel-website/src/db/seed.ts` as the executable seed entrypoint.

**Critical constraint:** `src/db/index.ts` contains `import "server-only"`, which causes a runtime error when the module is loaded outside the Next.js server environment. The seed script **must not** import from `src/db/index.ts`.

Instead, the seed script should create its own database connection by:

1. importing `getDatabaseUrl` and `resolveDatabasePath` from `./utils` (no `server-only` guard)
2. importing `Database` from `better-sqlite3` and `drizzle` from `drizzle-orm/better-sqlite3`
3. importing `* as schema` from `./schema`
4. constructing the Drizzle instance locally, applying the same pragmas (`journal_mode = WAL`, `foreign_keys = ON`)

This mirrors the pattern in `index.ts` without the `server-only` import. A small helper function (e.g. `createSeedDb()`) within `seed.ts` can encapsulate this.

### 3. Seed script responsibilities

The seed script should:

1. create its own database connection (see §2 above)
2. ensure `travel-website/public/images/destinations/` exists (via `fs.mkdir` with `recursive: true`)
3. iterate through the canonical destination list from `destination-seed-data.ts`
4. for each destination, download the remote image if the local file does not already exist
5. upsert the corresponding destination row so `image` stores only the local filename
6. print a final summary showing counts of images downloaded/skipped and destination rows inserted/updated
7. close the database connection and exit

The script should use platform-standard Node APIs already available in the repo (`fetch`, `fs/promises`, `path`) and avoid adding new runtime dependencies.

### 4. Download behavior

Each destination record carries an explicit `filename` such as `bali.jpg`. The seed script writes files to:

```
travel-website/public/images/destinations/{filename}
```

Download rules:

- **Sequential downloads** — iterate one destination at a time to keep implementation simple and reduce risk of CDN throttling.
- **Skip existing** — if the target file already exists on disk, skip the download. This keeps reruns fast while still allowing database rows to be refreshed.
- **Fail fast** — if any image request returns a non-OK HTTP status, throw an error with the destination name and status code so the operator can diagnose the issue.
- **Write via buffer** — `fetch` → `response.arrayBuffer()` → `Buffer.from()` → `fs.writeFile()`. This is atomic enough for local seeding.
- **Preserve explicit filenames** — always use the `filename` from seed data, never derive names from URLs.

### 5. Database write strategy

The `destinations.image` column stores only the local filename (e.g. `bali.jpg`), not `/images/destinations/bali.jpg` and not the remote CDN URL. Later API/UI layers prepend `/images/destinations/` when shaping responses.

To avoid duplicate rows on rerun without changing the schema, use Drizzle's `onConflictDoUpdate` targeting the primary key:

```typescript
db.insert(destinations)
  .values({ id, name, description, country, region, category, priceLevel, rating, bestSeason, latitude, longitude, image: filename })
  .onConflictDoUpdate({
    target: destinations.id,
    set: { name, description, country, region, category, priceLevel, rating, bestSeason, latitude, longitude, image: filename },
  })
  .run();
```

This inserts on first run and updates all fields on subsequent runs, keeping destination IDs stable for future foreign-key references such as `trip_stops.destination_id`.

The script does not need to delete non-seeded destination rows. Its responsibility is to ensure the canonical seed set exists and is current.

### 6. File structure

```
travel-website/src/db/
├── destination-seed-data.ts   # canonical 30-destination list with all fields + CDN URLs
├── seed.ts                    # CLI entrypoint: creates DB connection, downloads images, upserts rows
├── seed.test.ts               # unit tests for seed helpers
├── index.ts                   # (existing, unchanged — has server-only guard)
├── schema.ts                  # (existing, unchanged)
├── schema.test.ts             # (existing, unchanged)
├── utils.ts                   # (existing, unchanged — reused by seed.ts)
└── utils.test.ts              # (existing, unchanged)
```

Keep the implementation small and testable by separating pure and side-effectful logic within the seed module:

- `destination-seed-data.ts`: exports `DESTINATION_SEED_DATA` — a typed constant array. No side effects, easily importable from tests.
- `seed.ts`: orchestration entrypoint with exported helper functions for:
  - `createSeedDb()` — standalone DB connection (bypasses `server-only`)
  - `downloadImage(sourceUrl, destPath)` — downloads a single image
  - `upsertDestination(db, record)` — maps seed data to a Drizzle upsert
  - `runSeed()` — top-level orchestrator called when the module is executed directly

Exporting the helpers allows tests to exercise individual behaviors without running the full script.

### 7. CLI integration

Add a package script in `travel-website/package.json`:

```json
"db:seed": "tsx src/db/seed.ts"
```

This keeps the workflow aligned with the existing `db:*` command family and makes the final execution step explicit and repeatable.

### 8. Image git management

Downloaded images land in `travel-website/public/images/destinations/` which is already tracked by git (the directory contains `.gitkeep` and is not excluded by `.gitignore`). After running the seed script:

- the `.gitkeep` file can remain (harmless)
- all 30 `.jpg` files should be committed to the repository so that fresh clones are self-contained and the development server can serve images without requiring every developer to run the seed script first

The implementation step should commit the downloaded images as part of the task completion.

### 9. Validation and testing approach

Implementation should follow TDD where practical:

- **Seed data completeness** — verify the exported array has exactly 30 entries, each with all required fields populated (non-empty `description`, valid `latitude`/`longitude`, non-empty `sourceUrl` and `filename`).
- **Data mapping** — test that the helper that maps seed data to a Drizzle insert payload produces the correct shape (e.g. `image` equals `filename`, no `sourceUrl` leaking into the DB payload).
- **Download behavior** — test with a mocked `fetch` (via `vi.fn()`) and a temporary directory:
  - verifies that an existing file is skipped (no fetch call made)
  - verifies that a missing file triggers a fetch and writes the buffer to the correct path
  - verifies that a non-OK response throws with a descriptive error
- **Idempotent database writes** — test against an in-memory SQLite database (using the same `createTestDb()` pattern from `schema.test.ts`):
  - first upsert inserts the row
  - second upsert with changed fields updates the row
  - row count remains 1 after two upserts of the same ID

Tests should **not** make real network requests. Real CDN verification belongs to the manual seed run.

### 10. Manual execution expectations

After implementation, the task should be completed by running the seed command once in the repository's `travel-website/` directory so that:

- the local destination image directory contains all 30 curated image files
- the database contains the 30 corresponding seeded destination rows
- each row's `image` field matches the local filename used on disk

The implementation summary should record the exact command used (e.g. `npm run db:seed`) and the observed result counts (images downloaded/skipped, rows inserted/updated).

## Implementation Plan

1. Create `travel-website/src/db/destination-seed-data.ts` with the full 30-destination catalog (all fields populated including `description`, `latitude`, `longitude`, and CDN source URLs).
2. Add `travel-website/src/db/seed.test.ts` with focused tests for: seed data completeness/validation, data-to-DB mapping, image download behavior (mocked fetch + temp directory), and idempotent database upserts (in-memory SQLite).
3. Implement `travel-website/src/db/seed.ts` with a standalone DB connection (bypassing `server-only`), image download logic, Drizzle `onConflictDoUpdate` upserts, and a summary printout.
4. Add `"db:seed": "tsx src/db/seed.ts"` to `travel-website/package.json`.
5. Run targeted tests (`npm run test -- src/db/seed.test.ts`) and fix any failures.
6. Run lint and build (`npm run lint`, `AUTH_SECRET=test-secret npm run build`) to verify no regressions.
7. Run the seed command (`npm run db:seed`) to populate `travel-website/public/images/destinations/` and the `destinations` table.
8. Verify that the 30 downloaded filenames on disk match the filenames stored in the database.
9. Commit the downloaded images and all new source files, and document the execution result in the implementation-stage notes.
