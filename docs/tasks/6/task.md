# Task 6: Prepare Destination Seed Data and Image Assets

## Background

The product requirements for destination discovery depend on visually rich destination cards and detail views, and the repository-level design specifies that destination images should be sourced from Unsplash/Pexels CDNs but ultimately served locally from `travel-website/public/images/destinations/`. The database schema already includes a required `image` field on the `destinations` table, so Task 6 needs to establish the missing content pipeline that turns curated destination metadata plus external CDN URLs into local static assets and matching database records.

This task is also foundational for later destination API and UI work. Without stable seed data and local image filenames, Task 7 and Task 8 would have no consistent dataset to query or render.

## Goal

Design a seed-data workflow that:

- defines the initial curated destination dataset for the application
- downloads each destination image from an approved Unsplash or Pexels CDN URL into `travel-website/public/images/destinations/`
- stores the corresponding local filename, rather than the remote CDN URL, in the `destinations.image` column
- can be run from the `travel-website/` app as a repeatable setup step for local development and testing

The design should stay aligned with the current Next.js + TypeScript + Drizzle + SQLite architecture and minimize unnecessary new infrastructure.

## Non-Goals

- Implementing destination list or detail APIs
- Building destination browsing UI components or pages
- Introducing image optimization services, background jobs, or remote asset proxies
- Persisting CDN source URLs in the database
- Expanding the schema beyond what is needed for the curated destination dataset
- Designing a generalized media library for other asset types
- Modifying the existing `src/db/index.ts` module or its `server-only` import

## Current State

- `docs/requirements.md` requires visitors to browse destinations with images, descriptions, and ratings (US-2.1) and later search/filter them (US-2.2, US-2.3).
- `docs/design.md` already defines the intended image strategy: download seed images from Unsplash/Pexels CDNs, store them locally under `travel-website/public/images/destinations/`, and expose them through `/images/destinations/{filename}`.
- `travel-website/src/db/schema.ts` already defines the `destinations` table with all required fields for the seed dataset, including `name`, `description`, `country`, `region`, `category`, `priceLevel`, `rating`, `bestSeason`, `latitude`, `longitude`, and required `image`. The table also enforces check constraints: `priceLevel` must be between 1 and 5, and `rating` must be between 0 and 5.
- `travel-website/src/db/index.ts` exposes the Drizzle SQLite connection but **imports `"server-only"`** (a Next.js build-time assertion), which means it cannot be imported directly by standalone scripts running outside the Next.js bundler. The seed script must create its own database connection instead.
- `travel-website/public/images/destinations/` already exists (containing only `.gitkeep`), so the seed workflow can target the final static asset directory directly.
- `travel-website/.gitignore` does **not** currently exclude downloaded image files from `public/images/destinations/`. Downloaded images should not be committed to version control, so a gitignore entry is needed.
- `travel-website/package.json` currently has no seed script. The existing npm scripts include `db:generate`, `db:migrate`, and `db:studio` for Drizzle Kit operations. Neither `tsx` nor `ts-node` is installed as a dependency.
- The `destinations` table has no uniqueness constraint on `name` or `image`, so repeatable seeding must be designed deliberately rather than relying on a database-enforced upsert key.
- The runtime environment is Node v24 with TypeScript strict mode enabled. Node's built-in `fetch`, `fs/promises`, and `path` APIs are sufficient for download and filesystem work.
- Existing tests in the repo (e.g., `src/db/index.test.ts`, `src/db/schema.test.ts`) handle the `server-only` import by mocking it: `vi.mock("server-only", () => ({}))`. They create in-memory SQLite databases with raw `CREATE TABLE` SQL rather than running Drizzle migrations, and clean up with `sqlite.close()` in `afterEach`.
- The Drizzle migration (`drizzle/0000_misty_azazel.sql`) must have been applied before the seed script can insert rows. The `db:migrate` npm script handles this.

## Proposed Design

### 1. Seed data should be defined as a curated manifest

Add a dedicated TypeScript module for the destination seed manifest, separate from the executable seed script.

Recommended future file split:

| File | Purpose |
|---|---|
| `travel-website/src/db/destination-seed-data.ts` | Exports the curated list of 30 destinations and their CDN image metadata |
| `travel-website/src/db/seed.ts` | Orchestrates downloading images and inserting/updating DB rows |

Each manifest entry should include:

- `name`
- `description`
- `country`
- `region`
- `category`
- `priceLevel` (integer 1–5, must satisfy the schema check constraint)
- `rating` (number 0–5, must satisfy the schema check constraint)
- `bestSeason`
- `latitude`
- `longitude`
- `image.sourceUrl`
- `image.filename`

The 30 destinations listed in `docs/design.md` should be treated as the authoritative starting dataset for this task. The manifest should use stable, human-readable filenames such as `bali.jpg` and `kyoto.jpg`, because those filenames become the database values used by later APIs and UI.

Keeping the seed data in its own module has three benefits:

1. it keeps `seed.ts` focused on orchestration rather than embedding a very large literal array
2. it makes it easier to test and validate the dataset structure independently
3. it gives later tasks a single source of truth for expected seeded destinations

### 2. The seed script must create its own database connection

The existing `src/db/index.ts` imports `"server-only"`, which is a Next.js build-time assertion that throws at module-load time when executed outside the Next.js bundler. The seed script runs as a standalone Node process, so **it cannot import `db` from `src/db/index.ts`**.

Instead, the seed script should create its own lightweight Drizzle database connection:

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL ?? "./data/app.db";
const sqlite = new Database(DATABASE_URL);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });
```

This mirrors the pattern in `src/db/index.ts` but without the `server-only` import. The schema module (`src/db/schema.ts`) has no `server-only` dependency and can be imported freely.

After seeding completes, the script should close the database connection explicitly (`sqlite.close()`) so the Node process exits cleanly.

### 3. The seed script should download approved CDN images to the existing public directory

The executable seed script should resolve the destination image directory from the app root:

- base working directory: `travel-website/`
- target directory: `public/images/destinations`
- final public URL shape: `/images/destinations/{filename}`

The download flow should be:

1. ensure the destination image directory exists (`mkdir(..., { recursive: true })`)
2. iterate through the curated manifest entries
3. for each entry, skip the download if the file already exists locally (avoids redundant network calls on re-runs)
4. fetch each `image.sourceUrl`
5. validate that the response succeeded and that the content type is an image
6. write the file to `public/images/destinations/{filename}`
7. record the local filename for database insertion/update

The design should prefer **sequential downloads** instead of aggressive parallelism. The dataset is only 30 images, so sequential processing keeps the implementation simple and reduces the risk of rate-limiting, partial failures, or excessive concurrent remote requests.

### 4. The script should enforce basic download safety

Because the script performs network and filesystem writes, it should include lightweight safeguards:

- allow only approved remote hosts used by the curated dataset (for example `images.unsplash.com` and Pexels CDN hosts actually present in the manifest)
- reject non-HTTP(S) URLs
- require that filenames come from the curated manifest rather than being derived from arbitrary URLs
- normalize the output path using `path.resolve(...)` and confirm the result stays inside `public/images/destinations/`
- validate `content-type` starts with `image/` before writing to disk

These checks keep the seed flow aligned with the task's intended external sources and avoid turning the script into a generic arbitrary downloader.

### 5. Database writes should store local filenames only

The database contract should remain:

- `destinations.image` stores `filename` such as `bali.jpg`
- API and UI layers will later prepend `/images/destinations/`
- remote CDN URLs remain implementation details inside seed data, not persisted application data

All seed values must satisfy the existing schema check constraints: `priceLevel` between 1 and 5, `rating` between 0 and 5.

This matches the repository-level design and keeps the runtime browsing experience independent from third-party image hosts after seeding completes.

### 6. Reseeding should be idempotent without requiring a schema change

Since the `destinations` table does not currently have a unique constraint suitable for SQLite upsert, the design should avoid a destructive full-table reset and instead use a script-level synchronization strategy keyed by the curated destination names.

Recommended behavior:

1. load all existing destinations from the database
2. build an in-memory lookup by `name`
3. for each manifest entry:
   - if a destination with that `name` already exists, update its fields including `image`
   - otherwise insert a new row

This approach keeps the script rerunnable during development without forcing a schema migration or deleting seeded rows that may already be referenced by future `trip_stops` data.

Assumption: the curated manifest maintains unique destination names. If stricter uniqueness is needed later, that can be evaluated as a separate schema-level task.

### 7. Image download and DB persistence should be ordered for consistency

To avoid storing database rows that reference missing local files, the seed script should follow this ordering:

1. download or refresh images first
2. after all required files are present, insert/update database rows

If a download fails:

- the script should exit with a non-zero status
- the failing destination should be reported clearly
- database writes should not proceed for incomplete runs

For file writes, the implementation should prefer writing the fetched bytes directly to the final filename only after response validation succeeds. If implementation experience shows partial-file risk in practice, writing to a temporary file and renaming can be considered, but that extra complexity is not required by the initial design.

### 8. The app should expose the seed script through npm using `tsx`

Task 6 needs a repeatable command that developers can run from `travel-website/`. The project currently has no TypeScript script runner installed.

Recommended changes:

- add `tsx` as a devDependency (it is the standard lightweight TypeScript executor for Node, requiring no tsconfig changes)
- add an npm script: `"db:seed": "tsx src/db/seed.ts"`

The `tsx` runner handles TypeScript transpilation transparently and supports the existing `tsconfig.json` path aliases. It is preferred over `ts-node` because it has zero configuration requirements and faster startup.

Note: while Node v24 offers experimental native TypeScript stripping (`--experimental-strip-types`), `tsx` is more mature and handles edge cases (e.g., path aliases, ESM/CJS interop) that the seed script may encounter when importing from the Drizzle schema.

### 9. Downloaded images should be excluded from version control

The `.gitignore` should be updated to exclude downloaded destination images from version control while preserving the `.gitkeep` placeholder. Add a pattern such as:

```
# Downloaded destination images (seed script output)
public/images/destinations/*
!public/images/destinations/.gitkeep
```

This prevents large binary image files from bloating the repository while keeping the directory structure intact for fresh clones.

### 10. Database migration is a prerequisite

The seed script assumes the `destinations` table already exists. Running `npm run db:migrate` (which executes `drizzle-kit migrate`) must complete successfully before the seed script can insert rows. The seed script should **not** attempt to create tables or run migrations itself — that is the responsibility of the existing `db:migrate` command.

If the table does not exist when the seed script runs, the Drizzle ORM operation will throw, which is the correct behavior — it signals that migrations have not been applied.

### 11. Tests should focus on seed logic, not live network calls

The repository uses Vitest for backend tests, so Task 6 should add unit tests around the deterministic parts of the seed workflow rather than relying on real CDN downloads.

Tests should follow the established patterns from `src/db/index.test.ts` and `src/db/schema.test.ts`:

- mock `"server-only"` with `vi.mock("server-only", () => ({}))`
- create in-memory SQLite databases with raw `CREATE TABLE` SQL (not Drizzle migrations)
- enable foreign keys with `sqlite.pragma("foreign_keys = ON")`
- clean up with `sqlite.close()` in `afterEach`

Recommended test coverage:

- manifest validation: 30 entries exist, filenames are unique, all values satisfy schema constraints (priceLevel 1–5, rating 0–5)
- helper validation: approved host checks, output path construction, and image-content-type checks
- seed DB behavior: existing destination is updated, missing destination is inserted (using in-memory DB)
- download orchestration: mocked `fetch` and filesystem writes verify that local filenames are used and existing files are skipped

Test file location should follow the co-location convention: `src/db/seed.test.ts` and/or `src/db/destination-seed-data.test.ts`.

Live download verification should be a manual execution step of the seed command, not part of automated unit tests.

### 12. Manual verification should confirm both files and data

After implementation, the task should be manually verified by running the seed command and checking:

- image files exist under `travel-website/public/images/destinations/`
- the database contains seeded destination rows
- each row's `image` field contains only the local filename (not a URL)
- all `priceLevel` values are 1–5 and all `rating` values are 0–5
- rerunning the seed command does not create duplicate destination rows
- rerunning the seed command skips already-downloaded images

This is especially important because the issue explicitly requires actually downloading the images into the local public directory.

## Implementation Plan

1. Add `tsx` as a devDependency in `travel-website/package.json` and add a `"db:seed": "tsx src/db/seed.ts"` npm script alongside the existing `db:generate`, `db:migrate`, and `db:studio` scripts.
2. Update `travel-website/.gitignore` to exclude downloaded images from `public/images/destinations/` while preserving the `.gitkeep` file.
3. Create `travel-website/src/db/destination-seed-data.ts` containing the curated 30-destination manifest defined by the repository design, with all seed values satisfying the schema check constraints (priceLevel 1–5, rating 0–5).
4. Create `travel-website/src/db/seed.ts` that:
   - creates its own Drizzle database connection (mirroring `src/db/index.ts` but without the `server-only` import)
   - imports the manifest from `destination-seed-data.ts`
   - resolves the public image directory from the app root
   - downloads images sequentially with approved-host, content-type, and output-path validation, skipping files that already exist
   - inserts or updates destination rows using a name-based lookup
   - closes the database connection on completion
   - exits with non-zero status on any download failure, without writing incomplete data to the database
5. Add focused Vitest tests (`src/db/seed.test.ts` and/or `src/db/destination-seed-data.test.ts`) following the established test patterns: mock `"server-only"`, use in-memory SQLite with raw SQL schema creation, and mock `fetch`/`fs` for download orchestration tests.
6. Ensure `npm run db:migrate` has been run so the `destinations` table exists.
7. Run `npm run db:seed` to download the destination images into `travel-website/public/images/destinations/` and populate the database with local filenames.
8. Manually verify: downloaded assets exist, database records contain local filenames only, constraint values are valid, and rerunning the seed command is idempotent (no duplicates, skips existing images).
