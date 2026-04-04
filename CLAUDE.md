# CLAUDE.md

Use this file as the global entrypoint for Claude Code in this monorepo.

## Read order
1. Read this file first.
2. When working inside `back-end/` or `front-end/`, read the nearest workspace `CLAUDE.md`.
3. Read only the relevant files in `.claude/rules/` for the task at hand.

## Repo map
- `back-end/` -> NestJS 11 API with the flow `controller -> DTO -> use case -> repository`.
- `front-end/` -> React 18 + Vite SPA with the flow `page/layout -> hook -> service -> API`.
- `shared/` -> workspace package `@file-manager/shared` for enums and API contracts reused by both apps.

## Working rules
- Trace the current flow before editing. Backend: inspect controller + DTO + use case + repository. Frontend: inspect page + hook + service + shared types.
- Prefer the smallest safe change for a bug or scoped request. Do not restructure packages just to match an ideal architecture.
- Keep naming and file placement consistent with the repo. Backend files are currently `PascalCase.ts`; frontend features live under `src/features/<feature>/`.
- Reuse existing contracts before creating new ones. If a type or enum is shared by backend and frontend, it belongs in `shared/` or should reuse an export that is already there.
- Avoid `any`, generic helpers with one caller, and abstractions that hide simple logic.
- When explaining a change, show the root cause before the fix.
- If a broader refactor is actually needed, explain the impact on behavior, touched layers, and tests before doing it.

## Cross-package rules
- `shared/` is the source of truth for stable contracts used by more than one workspace.
- Do not leak Prisma model or payload types into shared contracts, frontend types, or backend use case outputs in new code.
- If you touch legacy code that already leaks Prisma types, contain the leak instead of widening it.
- When an API response changes, check whether `shared/`, backend outputs, and frontend consumers all need the same update.

## Commands
- `pnpm build` -> build all workspaces through Turbo.
- `pnpm test` -> run workspace tests through Turbo.
- `pnpm lint` -> lint all workspaces.
- `pnpm --dir shared build` -> rebuild `@file-manager/shared` after contract changes.
- `pnpm --dir back-end test` and `pnpm --dir back-end test:e2e` -> backend verification.
- `pnpm --dir front-end build` -> frontend verification.

## Rule index
- `.claude/rules/architecture.md` -> package boundaries, layering, and shared contracts.
- `.claude/rules/nestjs.md` -> controllers, DTOs, use cases, modules, RBAC, and NestJS conventions.
- `.claude/rules/prisma.md` -> repositories, schema work, explicit mapping, pagination, and soft delete.
- `.claude/rules/frontend.md` -> pages, hooks, services, shared types, styling, and frontend-specific constraints.
- `.claude/rules/tests.md` -> unit/e2e expectations and verification workflow.
- `.claude/rules/team-style.md` -> team review preferences and code style priorities.

## Optional skill integration
- This repo references the `boss-skills` plugin in other instruction files.
- If the Claude Code environment exposes skills such as `eng-test`, `eng-dto`, `eng-solid`, `frontend-design`, or `claudemd-sync`, invoke the relevant one before editing.
- If those skills are unavailable, follow the equivalent rules in `.claude/rules/` and continue without blocking the task.
