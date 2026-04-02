# Prepare Destination Seed Data and Image Assets

## Background

`docs/requirements.md` defines destination discovery as a core visitor experience, including destination browsing with images (US-2.1) and later search/filter features (US-2.2, US-2.3). `docs/design.md` further specifies that destination images should be sourced from Unsplash/Pexels CDN URLs during seeding, downloaded into `travel-website/public/images/destinations/`, and stored in the database as local filenames so the frontend can serve them from `/images/destinations/{filename}`.

Issue 69 covers the data-preparation foundation for that experience: organizing the initial destination catalog, implementing the seed workflow that materializes local image assets, and documenting the execution path needed to populate both the image directory and the `destinations` table.

## Goal

Create a technical design for a destination seed workflow that:

- defines the initial curated destination dataset
- downloads each destination image from its configured CDN URL into `travel-website/public/images/destinations/`
- stores only the local image filename in the `destinations.image` column
- can be run repeatedly in local/development environments without creating duplicate destination rows
- leaves the app ready for later destination API and UI tasks to consume locally served images

## Non-Goals

- implementing destination list/detail APIs or destination browsing UI
- introducing a CMS, admin upload flow, or runtime image management
- changing the frontend image rendering strategy beyond the existing `/images/destinations/{filename}` convention
- building a general-purpose production migration framework for arbitrary destination catalog changes
- validating remote CDN ownership or replacing the configured Unsplash/Pexels sources

## Current State

Verified against the current branch for issue 69:

- `docs/design.md` already defines the intended seed behavior, including the canonical 30-destination list and the rule that the database stores local filenames rather than remote URLs.
- `travel-website/src/db/schema.ts` already includes a `destinations` table with the fields required by the seed data, including a required `image` column for the stored local filename.
- `travel-website/public/images/destinations/` exists but currently contains only `.gitkeep`; no destination image assets have been downloaded yet.
- `travel-website/src/db/` currently contains database utilities and schema files, but there is no `seed.ts` or equivalent destination seed implementation.
- `travel-website/package.json` includes Drizzle scripts (`db:generate`, `db:migrate`, `db:push`, `db:studio`) and `tsx`, but it does not currently expose a dedicated database seed command.
- Destination APIs and pages are not present yet on this branch, so this task should prepare the data contract they will later consume rather than depend on those unfinished features.

## Proposed Design

### 1. Seed data source

Add a dedicated destination seed data module under `travel-website/src/db/` that exports the canonical initial destination list. Each entry should include:

- a stable numeric `id`
- display/data fields required by the `destinations` table (`name`, `description`, `country`, `region`, `category`, `priceLevel`, `rating`, `bestSeason`, `latitude`, `longitude`)
- image metadata (`sourceUrl`, `filename`)

The 30 destinations and filenames should follow the catalog already documented in `docs/design.md`. The seed module becomes the single source of truth for both the database rows and the downloaded image filenames.

Using stable IDs makes the seed process repeatable without requiring schema changes such as a new unique constraint on `name`.

### 2. Seed script responsibilities

Create `travel-website/src/db/seed.ts` as the executable seed entrypoint. The script should:

1. resolve the database connection using the existing shared DB utilities/configuration
2. ensure `travel-website/public/images/destinations/` exists
3. iterate through the canonical destination list
4. download each remote image into the local destination image directory
5. upsert the corresponding destination row so `image` stores only the local filename
6. print a final summary showing how many images were downloaded/skipped and how many destination rows were inserted/updated

The script should use platform-standard Node APIs already available in the repo (`fetch`, `fs/promises`, `path`) and avoid adding new runtime dependencies.

### 3. Download behavior

Each destination record should carry an explicit `filename` such as `bali.jpg`. The seed script writes files to:

`travel-website/public/images/destinations/{filename}`

Recommended download behavior:

- download sequentially to keep implementation simple and reduce risk of CDN throttling
- fail fast if any image request returns a non-OK status
- write files atomically enough for local seeding (`fetch` → `arrayBuffer`/`Buffer` → `writeFile`)
- preserve the explicit filename from seed data instead of deriving names from URLs

For repeatable local runs, the script should skip re-downloading a file when the target filename already exists. This keeps reruns fast while still allowing the database rows to be refreshed. If implementation later needs a refresh mode, that can be added as an optional enhancement, not a requirement for this issue.

### 4. Database write strategy

The `destinations.image` column should store only the local filename (for example `bali.jpg`), not `/images/destinations/bali.jpg` and not the remote CDN URL. Later API/UI layers can prepend `/images/destinations/` when shaping responses.

To avoid duplicate rows on rerun without changing the schema, the seed script should treat the seed dataset IDs as canonical and perform an idempotent write per record:

- insert rows with explicit IDs on first run
- update the existing row when that ID is already present

This keeps destination IDs stable for future foreign-key references such as `trip_stops.destination_id`.

The script does not need to delete non-seeded destination rows. Its responsibility is to ensure the canonical seed set exists and is current.

### 5. Suggested helper structure

Keep the implementation small and testable by separating pure and side-effectful logic:

- `destination-seed-data.ts`: canonical data list
- `seed.ts`: orchestration entrypoint
- internal helpers in `seed.ts` (or a small sibling module if needed) for:
  - resolving the public image directory
  - downloading a single image
  - mapping seed data shape to the database insert/update payload

This allows tests to focus on data mapping and download behavior without requiring the full script to run in-process against real network resources.

### 6. CLI integration

Add a package script in `travel-website/package.json` for the seed workflow, for example:

`"db:seed": "tsx src/db/seed.ts"`

This keeps the workflow aligned with the existing `db:*` command family and makes the final execution step explicit and repeatable.

### 7. Validation and testing approach

Implementation should follow TDD where practical:

- add unit tests for the pure mapping/validation helpers
- test download behavior with mocked `fetch` and a temporary directory
- test idempotent database writes against an isolated SQLite database path

The design does not require checking real CDN responses in automated tests. Real network download verification belongs to the final manual seed run.

### 8. Manual execution expectations

After implementation, the task should be completed by running the seed command once in the repository’s `travel-website/` app so that:

- the local destination image directory contains the curated image files
- the database contains the corresponding seeded destination rows
- each row’s `image` field matches the local filename used on disk

The implementation summary for the task should record the exact command used and the observed result counts.

## Implementation Plan

1. Create the issue-level canonical destination seed data module under `travel-website/src/db/`, matching the 30-destination catalog already documented in `docs/design.md`.
2. Add focused tests for seed data mapping, image download behavior, and idempotent database writes using mocked network/file-system boundaries where possible.
3. Implement `travel-website/src/db/seed.ts` to create the image directory, download missing images, and insert/update destination rows with local filenames.
4. Add an npm script such as `db:seed` in `travel-website/package.json` to standardize execution.
5. Run targeted tests for the seed workflow.
6. Run the seed command manually to populate `travel-website/public/images/destinations/` and the `destinations` table.
7. Verify that the downloaded filenames on disk match the filenames stored in the database and document the execution result in the implementation-stage notes.
