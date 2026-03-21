## Related Files

### `docs/`
Project requirements, design, and task documentation.

- `requirements.md` — Product requirements document (user stories).
- `design.md` — Technical design document (tech stack, database, API, UI style, seed data, etc.).
- `tasks.md` — Development task checklist, listing all pending tasks in order.
- `tasks/` — Directory for design and implementation documents of tasks, organized by issue number.

## Task Completion Rules

- Tasks from `tasks.md` will be created as GitHub issues, with each issue corresponding to one task and the issue title matching the task name.
- When completing a task, always refer to the requirements document `docs/requirements.md` and the design document `docs/design.md` to ensure the implementation meets requirements and adheres to the design.
- Each task follows a four-stage process. Be clear about the current stage and strictly follow stage-specific requirements:
    1. **Design**: Analyze requirements, write a technical design document, and save it to `docs/tasks/<issue-number>/task.md`.
    2. **Design Revise**: Review and revise `task.md`.
    3. **Implement**: Implement code based on `task.md`, and save an implementation summary to `docs/tasks/<issue-number>/implement.md`.
    4. **Implement Revise**: Review and revise the implementation code.

- The implementation stage follows TDD (Test-Driven Development): write a failing test first, implement the minimal code to make it pass, then refactor.
- Backend code must include unit tests covering at least API handlers, authentication logic, core business logic, and data validation logic.
- A task is not considered complete until its corresponding tests are written and passing.
- All project dependencies must be installed and managed with npm. Do not use yarn, pnpm, or bun. Ensure `package-lock.json` stays in sync with dependency changes when committing.

## Coding Standards

### TypeScript

- Enable strict mode (`"strict": true`). Do not use `any` type; explicitly annotate function parameters and return types.
- Prefer `interface` for defining object shapes; use `type` only when union types or mapped types are needed.
- Use `const` for immutable bindings; use `let` only when reassignment is necessary. Never use `var`.
- Replace `enum` with `as const` constant objects to avoid runtime overhead.
- Use `async/await` for all asynchronous operations. Bare `.then()` chains are prohibited.
- Naming conventions:
  - Variables and functions: `camelCase`.
  - Types, interfaces, and components: `PascalCase`.
  - Constants: `UPPER_SNAKE_CASE`.
  - File names: component files use `PascalCase.tsx`; utility and module files prefer `kebab-case.ts`.
  - Next.js convention-based file names follow framework defaults and are exempt from the above rule, e.g., `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`.

### Next.js (App Router)

- All components are Server Components by default. Add the `"use client"` directive only when browser APIs, event handlers, or React hooks are required.
- Prefer fetching data directly from the database or internal functions within Server Components. Avoid calling your own API Routes from server-side components.
- API Route handlers use named exports (`export async function GET()`); do not use default exports.
- Page components use default exports (`export default function Page()`).
- Route parameters are accessed via the `params` prop; query parameters via the `searchParams` prop. Both are asynchronous in Next.js 15.
- Use the `<Image>` component from `next/image` for displaying images; always specify `width`, `height`, or `fill`.
- Use the `<Link>` component from `next/link` for page navigation. Do not use `<a>` tags for internal links.
- Error handling: each route segment may provide `error.tsx` (runtime errors) and `loading.tsx` (loading states).
- Environment variables: use `process.env.XXX` directly on the server; client-side variables must use the `NEXT_PUBLIC_` prefix.

## General Rules

- Each file should export a single primary entity (component, utility function, or module) by default.
- Next.js `route.ts` files may export multiple handlers by HTTP method, e.g., `GET`, `POST`, `PUT`, `DELETE`.
- Import order: React/Next.js built-ins → third-party libraries → internal project modules → type imports, separated by blank lines between groups.
- Error handling should only be added at system boundaries (API Routes, form submissions, external calls). Do not add redundant try/catch in internal pure functions.
- Never hard-code secrets, passwords, or other sensitive information in source code. Manage all sensitive values through `.env` files.