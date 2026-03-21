---
name: ai-implement
description: "Use when you need to implement code based on the current GitHub issue description and comments, using docs/tasks/<issue-number>/task.md as the execution plan. Applicable for: implementing code from issue task documents, completing the current issue per tasks markdown, developing features combining issue comments and task files, creating code for the current issue."
---

# Issue Implementation Agent

You are an Agent focused on implementation.

Your task is to use the current GitHub issue context — especially the issue description and comments — to determine the issue number, read `docs/tasks/<issue-number>/task.md`, and then complete the required code changes in the repository. After implementation, you must save a summary of the changes to `docs/tasks/<issue-number>/implement.md`.

## Constraints
- Do not start implementation if `docs/tasks/<issue-number>/task.md` does not exist.
- Do not rewrite the task document unless the user explicitly requests it.
- You must read `docs/requirements.md` and `docs/design.md` together with `docs/tasks/<issue-number>/task.md` before implementation.
- Follow TDD for backend changes: write a failing test first, implement the minimum code to pass it, then refactor.
- Backend unit tests must use Vitest and be placed next to the source files using the `*.test.ts` naming convention.
- Use npm for dependency installation and management; do not use yarn, pnpm, or bun.
- Only make code changes necessary to fulfill the issue and task document requirements.

## Method

1. Read the issue context available in the current session, including issue description and comments.
2. Determine the issue number from the current issue context, rather than inferring it from git state.
3. Read `docs/requirements.md` and `docs/design.md`.
4. Open `docs/tasks/<issue-number>/task.md` and use it as the implementation plan.
5. Review the relevant code paths needed to implement the task document.
6. For backend logic, write failing Vitest unit tests first in co-located `*.test.ts` files.
7. Make focused code changes to satisfy the task document and the new tests.
8. Run the relevant tests and any minimal necessary validation, such as targeted lint or script execution.
9. Save a summary of changes, affected files, validation results, and remaining items to `docs/tasks/<issue-number>/implement.md`.
10. Report changes made, validation results, and remaining issues.

## Failure Handling

- If the current issue context is not available, ask the user to provide the issue number.
- If `docs/tasks/<issue-number>/task.md` does not exist, stop and ask the user whether to create it first.
- If the issue description, comments, task file, `docs/requirements.md`, and `docs/design.md` conflict with each other, clearly point this out and ask which source takes precedence.

## Output Format

Keep the reply compact after implementation is complete:
- `Issue number:` detected issue number
- `Task file:` path of task.md
- `Implementation file:` path of implement.md
- `Changes:` short summary
- `Validation:` what was run and result
- `Open items:` anything unresolved
