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

## Current State

- `docs/requirements.md` requires visitors to browse destinations with images, descriptions, and ratings (US-2.1) and later search/filter them (US-2.2, US-2.3).
- `docs/design.md` already defines the intended image strategy: download seed images from Unsplash/Pexels CDNs, store them locally under `travel-website/public/images/destinations/`, and expose them through `/images/destinations/{filename}`.
- `travel-website/src/db/schema.ts` already defines the `destinations` table with all required fields for the seed dataset, including `name`, `description`, `country`, `region`, `category`, `priceLevel`, `rating`, `bestSeason`, `latitude`, `longitude`, and required `image`.
- `travel-website/src/db/index.ts` already exposes the Drizzle SQLite connection that future seed code should reuse.
- `travel-website/public/images/destinations/` already exists, so the seed workflow can target the final static asset directory directly.
- `travel-website/package.json` currently has no seed script and the repository currently has no `src/db/seed.ts` implementation.
- The `destinations` table has no uniqueness constraint on `name` or `image`, so repeatable seeding must be designed deliberately rather than relying on a database-enforced upsert key.
- The runtime environment is Node-based TypeScript with strict mode enabled. Node's built-in `fetch`, `fs/promises`, and `path` APIs are sufficient for download and filesystem work.

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
- `priceLevel`
- `rating`
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

### 2. The seed script should download approved CDN images to the existing public directory

The executable seed script should resolve the destination image directory from the app root:

- base working directory: `travel-website/`
- target directory: `public/images/destinations`
- final public URL shape: `/images/destinations/{filename}`

The download flow should be:

1. ensure the destination image directory exists (`mkdir(..., { recursive: true })`)
2. iterate through the curated manifest entries
3. fetch each `image.sourceUrl`
4. validate that the response succeeded and that the content type is an image
5. write the file to `public/images/destinations/{filename}`
6. record the local filename for database insertion/update

The design should prefer **sequential downloads** instead of aggressive parallelism. The dataset is only 30 images, so sequential processing keeps the implementation simple and reduces the risk of rate-limiting, partial failures, or excessive concurrent remote requests.

### 3. The script should enforce basic download safety

Because the script performs network and filesystem writes, it should include lightweight safeguards:

- allow only approved remote hosts used by the curated dataset (for example `images.unsplash.com` and Pexels CDN hosts actually present in the manifest)
- reject non-HTTP(S) URLs
- require that filenames come from the curated manifest rather than being derived from arbitrary URLs
- normalize the output path using `path.resolve(...)` and confirm the result stays inside `public/images/destinations/`
- validate `content-type` starts with `image/` before writing to disk

These checks keep the seed flow aligned with the task's intended external sources and avoid turning the script into a generic arbitrary downloader.

### 4. Database writes should store local filenames only

The database contract should remain:

- `destinations.image` stores `filename` such as `bali.jpg`
- API and UI layers will later prepend `/images/destinations/`
- remote CDN URLs remain implementation details inside seed data, not persisted application data

This matches the repository-level design and keeps the runtime browsing experience independent from third-party image hosts after seeding completes.

### 5. Reseeding should be idempotent without requiring a schema change

Since the `destinations` table does not currently have a unique constraint suitable for SQLite upsert, the design should avoid a destructive full-table reset and instead use a script-level synchronization strategy keyed by the curated destination names.

Recommended behavior:

1. load all existing destinations from the database
2. build an in-memory lookup by `name`
3. for each manifest entry:
   - if a destination with that `name` already exists, update its fields including `image`
   - otherwise insert a new row

This approach keeps the script rerunnable during development without forcing a schema migration or deleting seeded rows that may already be referenced by future `trip_stops` data.

Assumption: the curated manifest maintains unique destination names. If stricter uniqueness is needed later, that can be evaluated as a separate schema-level task.

### 6. Image download and DB persistence should be ordered for consistency

To avoid storing database rows that reference missing local files, the seed script should follow this ordering:

1. download or refresh images first
2. after all required files are present, insert/update database rows

If a download fails:

- the script should exit with a non-zero status
- the failing destination should be reported clearly
- database writes should not proceed for incomplete runs

For file writes, the implementation should prefer writing the fetched bytes directly to the final filename only after response validation succeeds. If implementation experience shows partial-file risk in practice, writing to a temporary file and renaming can be considered, but that extra complexity is not required by the initial design.

### 7. The app should expose the seed script through npm

Task 6 needs a repeatable command that developers can run from `travel-website/`. Since the app is TypeScript-based and currently has no executable TypeScript runner for one-off scripts, the implementation should add a small runtime for this purpose and expose an npm command.

Recommended future package-level changes:

- add an npm script such as `db:seed`
- use a standard TypeScript script runner appropriate for the repo's npm-based tooling

The design does not mandate a specific package name in this document, but the implementation should choose the smallest common Node/TypeScript approach that can execute `src/db/seed.ts` reliably from npm.

### 8. Tests should focus on seed logic, not live network calls

The repository uses Vitest for backend tests, so Task 6 should add unit tests around the deterministic parts of the seed workflow rather than relying on real CDN downloads.

Recommended test coverage:

- manifest validation: 30 entries exist and filenames are unique
- helper validation: approved host checks, output path construction, and image-content-type checks
- seed DB behavior: existing destination is updated, missing destination is inserted
- download orchestration: mocked `fetch` and filesystem writes verify that local filenames are used

Live download verification should be a manual execution step of the seed command, not part of automated unit tests.

### 9. Manual verification should confirm both files and data

After implementation, the task should be manually verified by running the seed command and checking:

- image files exist under `travel-website/public/images/destinations/`
- the database contains seeded destination rows
- each row's `image` field contains only the local filename
- rerunning the seed command does not create duplicate destination rows

This is especially important because the issue explicitly requires actually downloading the images into the local public directory.

## Implementation Plan

1. Create `travel-website/src/db/destination-seed-data.ts` containing the curated 30-destination manifest defined by the repository design.
2. Add a runnable seed entry point at `travel-website/src/db/seed.ts` that imports the manifest, resolves the public image directory, and reuses the existing DB connection from `src/db/index.ts`.
3. Implement download helpers using Node `fetch`, `fs/promises`, and `path`, including approved-host, content-type, and output-path validation.
4. Implement idempotent destination persistence by selecting existing destinations by name and performing insert-or-update behavior without deleting the whole table.
5. Add an npm seed command in `travel-website/package.json` using a minimal TypeScript script runner so the seed script can be executed directly from npm.
6. Add focused Vitest tests for manifest validation and seed helper logic with mocked network/filesystem behavior.
7. Run the seed command to download the destination images into `travel-website/public/images/destinations/` and populate the database with local filenames.
8. Manually verify the downloaded assets, database records, and rerun behavior to confirm the workflow is complete and repeatable.
