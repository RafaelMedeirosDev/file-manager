# CLAUDE.md - Backend

Use this file together with the root `CLAUDE.md`.

## Read order
1. `../CLAUDE.md`
2. `../.claude/rules/architecture.md`
3. `../.claude/rules/nestjs.md`
4. `../.claude/rules/prisma.md`
5. `../.claude/rules/tests.md`
6. `../.claude/rules/team-style.md`

## Local reminders
- Backend file naming is currently `PascalCase.ts` for controllers, use cases, repositories, and DTOs.
- Most providers and controllers are wired in `src/app.module.ts`; auth stays in `src/auth/auth.module.ts`.
- Unit tests live beside use cases. E2E tests live in `back-end/test/`.
- Preserve RBAC and soft-delete behavior on every endpoint.
- If a backend response is reused by the SPA, update `shared/` in the same task instead of duplicating a local type.
