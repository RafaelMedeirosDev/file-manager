# AGENTS.md

This file provides guidance to coding agents working with code in this repository.

> Each sub-project has its own detailed AGENTS.md:
> - Backend rules → `back-end/AGENTS.md`
> - Frontend rules → `front-end/AGENTS.md`

## Monorepo Structure

pnpm workspace with three packages:
- `back-end/` — NestJS 11 REST API (port 3000, via `PORT`)
- `front-end/` — React 18 + Vite SPA (port 5173)
- `shared/` — `@file-manager/shared`, enums and API contracts used by both apps.
  Run `pnpm --dir shared build` after editing anything under `shared/src/`.

## Commands

### Root — Turborepo (orquestra todos os workspaces)
```bash
pnpm install                  # install all workspaces
pnpm build                    # build back-end + front-end (paralelo, com cache)
pnpm dev                      # back-end watch + front-end dev server (paralelo)
pnpm lint                     # ESLint em todos os workspaces (com --fix)
pnpm lint:ci                  # ESLint sem --fix, --max-warnings 0 (o que o CI roda)
pnpm format                   # Prettier em todos os workspaces
pnpm test                     # unit tests em todos os workspaces
pnpm test:e2e                 # E2E tests (depende de build)
pnpm prisma:generate          # regenerate Prisma client
pnpm prisma:migrate:dev       # create + apply migration (dev)
pnpm prisma:migrate:deploy    # apply migrations (production)
```

### Atalhos diretos (sem Turborepo)
```bash
pnpm start:dev                # backend em watch mode
pnpm start:front              # frontend dev server
pnpm build:back               # build backend → back-end/dist/
pnpm build:front              # build frontend → front-end/dist/
```

### Backend (`back-end/`)
```bash
pnpm --dir back-end test             # unit tests (Jest)
pnpm --dir back-end test:watch       # unit tests in watch mode
pnpm --dir back-end test:cov         # coverage report
pnpm --dir back-end test:e2e         # E2E tests (RBAC coverage)
pnpm --dir back-end lint             # ESLint --fix
pnpm --dir back-end format           # Prettier
pnpm --dir back-end prisma:generate  # regenerate Prisma client
pnpm --dir back-end prisma:migrate:dev  # create + apply migration
pnpm --dir back-end prisma:studio    # Prisma Studio GUI
```

### Frontend (`front-end/`)
```bash
pnpm --dir front-end dev     # Vite dev server
pnpm --dir front-end build   # tsc + vite build
```

## Architecture Overview

### Backend: Controller → DTO → UseCase → Repository → DB

| Layer | Location | Responsibility |
|---|---|---|
| Controller | `src/controllers/` | Parse request, call UseCase, return response |
| DTO | `src/shared/dto/` | Input validation (class-validator) |
| UseCase | `src/usecases/` | All business logic, ownership checks, logging |
| Repository | `src/repositories/` | Prisma queries only — no logic |

- All providers are registered in `app.module.ts`
- `userId` always comes from the JWT (`req.user.sub`), never from the request body
- Soft delete on all models — always check `entity.deletedAt` before using
- Ownership: USER can only access their own resources; ADMIN has full access
- Error messages via `ErrorMessagesEnum` — never throw literal strings

### Frontend: Feature-Based

Each domain (`auth`, `users`, `folders`, `exams`, `exam-requests`) lives in `src/features/{feature}/` with three layers:
- `services/` — HTTP calls only (Axios instance from `src/services/api.ts`)
- `hooks/` — state, logic, pagination, side effects
- `components/` — pure UI, receives props only

Pages in `src/pages/` compose features — no logic or direct HTTP calls.

Global types live in `src/shared/types/`. Custom Tailwind classes are defined in `src/styles.css` (`app-card`, `btn-primary`, `app-input`, etc.) — use these before creating new ones.

## Database Schema

```
User  (id, name, email, password, role: ADMIN|USER, deletedAt)
  └─ Folder (id, name, userId, folderId?: parent, deletedAt)
       └─ File (id, name, userId, folderId?, extension, key, url, deletedAt)

Exam  (id, name, code: unique, category: ExamCategory, deletedAt)
  ExamCategory: THROMBOPHILIA | MICROBIOLOGY | ENDOCRINE_METABOLIC | IMMUNOLOGY
              | OBSTETRIC_MARKERS | IMAGING | BIOCHEMISTRY | HEMATOLOGY

ExamRequest  (id, userId, indication, deletedAt)
  └─ exams: Exam[]  (many-to-many — join table _ExamToExamRequest)
```

Folders are hierarchical (self-referencing `folderId`). Files live in Cloudflare R2 and are read with `GetObjectCommand` by `key`, so the bucket does not need to be public. `url` is legacy: still written to allow a rollback, never exposed by the API.

## Pagination Pattern (Backend)

All list routes return `{ data: T[], meta: { page, limit, total, hasNextPage } }`.
- QueryDTO: `page?` (default 1), `limit?` (default 10, max 100) + domain filters
- Filtering and pagination happen **in-memory in the UseCase** — repositories expose `findAll()` with no skip/take
- Sorted by `name` using `localeCompare('pt-BR', { sensitivity: 'base' })`

## Environment Setup

Copy `.env.example` → `.env` in each sub-directory before running.

Required backend vars: `DATABASE_URL`, `JWT_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.
Optional, with defaults: `DATABASE_SCHEMA`, `PORT`, `NODE_ENV`, `LOG_LEVELS`, `MAX_UPLOAD_SIZE_BYTES`, `CORS_ORIGINS`.
`R2_ENDPOINT` is in `.env.example` but is not read by any code.

Required frontend var: `VITE_API_URL` — no default; the app throws on boot without it. In development: `http://localhost:3000`.

## Skills (Plugin: boss-skills)

> Este projeto referencia o plugin `boss-skills`. Se as skills estiverem disponíveis
> no ambiente, invoque a correspondente antes de editar. Se não estiverem, siga as
> regras equivalentes em `.claude/rules/` e siga com a tarefa — a ausência da skill
> não deve bloquear o trabalho.
>
> **Auto-ativação:** skills de engenharia ativam automaticamente por contexto (arquivo criado/modificado ou keyword detectada).
> **Skills disponíveis:** `eng-test`, `eng-solid`, `eng-dto`, `frontend-design`, `claudemd-sync`.
> **Após criar qualquer arquivo:** `eng-test` é mandatório.
> **Ao criar/modificar DTOs:** `eng-dto` é mandatório.
> **Ao criar/revisar UI:** `frontend-design` é mandatório.
> **Ao revisar SOLID:** `eng-solid` é mandatório.
