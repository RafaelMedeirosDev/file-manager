# File Manager

Monorepo with three packages managed by pnpm workspaces + Turborepo:

| Package | Stack | Port |
|---|---|---|
| `back-end/` | NestJS 11 REST API | 3001 |
| `front-end/` | React 18 + Vite SPA | 5173 |
| `shared/` | `@file-manager/shared` — enums and API contracts | — |

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL (configured via `DATABASE_URL`)
- Cloudflare R2 bucket (for file storage)

## Setup

```bash
# 1. Install all dependencies (also compiles shared/dist automatically)
pnpm install

# 2. Copy environment files and fill in the values
cp back-end/.env.example back-end/.env
cp front-end/.env.example front-end/.env

# 3. Run database migrations
pnpm prisma:migrate:dev
```

## Running in development

```bash
pnpm dev        # starts both back-end (watch) and front-end (Vite) in parallel
```

Or individually:

```bash
pnpm start:dev    # back-end only (watch mode)
pnpm start:front  # front-end only
```

## Building for production

```bash
pnpm build        # builds all workspaces via Turbo (shared → back-end → front-end)
```

## Testing

```bash
pnpm test                        # unit tests for all workspaces
pnpm --dir back-end test:e2e     # backend E2E tests (requires a running DB)
```

## Shared package

`@file-manager/shared` contains enums, types, and API contracts used by both the backend and frontend.
Its compiled output (`shared/dist/`) is **gitignored**.

| Situation | What to do |
|---|---|
| Fresh clone / after `pnpm install` | Nothing — `prepare` compiles it automatically |
| After editing anything in `shared/src/` | Run `pnpm --dir shared build` |

> Always import as `import { ... } from '@file-manager/shared'`. Never use relative paths that point into `shared/`.

## Environment variables

### Backend (`back-end/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_SCHEMA` | Postgres schema name |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `PORT` | API port (default: 3001) |
| `NODE_ENV` | `development` or `production` |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_ENDPOINT` | R2 S3-compatible endpoint |
| `R2_PUBLIC_URL` | Public base URL for file access |

### Frontend (`front-end/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API URL (default: `http://localhost:3001`) |
