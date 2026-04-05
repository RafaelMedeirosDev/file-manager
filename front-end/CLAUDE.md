# CLAUDE.md - Frontend

Use this file together with the root `CLAUDE.md`.

## Read order
1. `../CLAUDE.md`
2. `../.claude/rules/architecture.md`
3. `../.claude/rules/frontend.md`
4. `../.claude/rules/tests.md`
5. `../.claude/rules/team-style.md`

## Local reminders
- The Axios instance is `src/services/api.ts`.
- Prefer `src/features/<feature>/{hooks,services,components}` for new feature logic.
- Reuse `src/shared/types/`, `src/shared/utils/apiUtils.ts`, and `src/styles.css` primitives before creating duplicates.
- Some working code still lives in `src/components`, `src/services`, and `src/types`; edit in place unless the task explicitly includes migration.
- If an API contract changes, check whether `@file-manager/shared` and frontend re-exports also need updates.
