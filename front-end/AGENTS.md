# AGENTS.md

## Stack
- React 18 + Vite + TypeScript
- Tailwind CSS (classes customizadas em styles.css: app-card, btn-primary, app-input, etc.)
- React Router v6
- Axios (instância em src/services/api.ts)
- SEM React Query por enquanto — estado local com useState/useCallback
- ESLint 9 (flat config) + Prettier configurados: `react-hooks/exhaustive-deps` é **error**

## Arquitetura (Feature-Based)
src/
├── features/{feature}/
│   ├── components/   → UI pura, só recebe props
│   ├── hooks/        → lógica, estado, chamadas via service
│   └── services/     → APENAS chamadas HTTP, sem estado
│   ├── contexts/     → estado compartilhado da feature (quando necessário)
│   └── utils/        → funções puras da feature
├── shared/
│   ├── components/   → UI reutilizável entre features (Modal)
│   ├── types/        → interfaces e types globais
│   └── utils/        → funções puras reutilizáveis (apiUtils)
├── services/         → instância axios (api.ts)
├── app/              → App, router, guards, layouts
├── components/       → legado: Sidebar, Icons
├── types/            → legado: auth
└── pages/            → montam features, sem lógica própria

## Regras obrigatórias
1. Chamadas HTTP SEMPRE em services/ — nunca direto nas pages ou hooks
2. Lógica e estado SEMPRE em hooks/ — nunca dentro de componentes
3. Componentes recebem props e renderizam — sem api.get() dentro
4. Types globais ficam em shared/types/ — nunca redeclarar o mesmo type
5. Funções utilitárias reutilizáveis ficam em shared/utils/
6. Evitar `any` — narrow o tipo ou crie uma interface local (a regra do ESLint está desligada para espelhar o backend, mas a orientação vale)
7. Classes CSS customizadas já existem em styles.css — usar antes de criar novas

## Backend (já pronto)
- Base URL: http://localhost:3000 (definida por VITE_API_URL, obrigatória)
- Auth: Bearer token no header Authorization
- Paginação: { data: T[], meta: { page, limit, total, hasNextPage } }
- Soft delete: registros têm deletedAt
- Roles: ADMIN (tudo) | USER (lista e baixa os próprios arquivos, faz upload na pasta padrão, exclui os próprios arquivos, troca a própria senha e cria solicitações de exames)
- 401 de sessão expirada encerra a sessão automaticamente, exceto em /auth/login e /users/me/password

## Endpoints principais
- POST /auth/login
- GET/POST/PATCH/DELETE /users
- PATCH /users/me/password
- GET/POST/PATCH/DELETE /folders
- GET/PATCH/DELETE /files, POST /files/upload, POST /files/bulk-upload
- GET /files/:id/download
- GET /exams, POST /exams, DELETE /exams/:id
- GET/POST/PATCH /exam-requests, GET /exam-requests/:id

## Login Page Layout Pattern — "Control Room"

`src/pages/LoginPage.tsx` uses a **split-screen layout** as the established SaaS design pattern for this project.

```
┌─────────────────────────────┬──────────────────────┐
│  Dark Navy panel (60%)      │  White form (40%)     │
│  · Dot-grid SVG background  │  · 4px brand-blue bar │
│  · Ghost "FM" watermark     │  · Wordmark + tagline │
│  · Brand mark + headline    │  · Field section label│
│  · Feature rows (table-row) │  · app-input fields   │
│  · Green status bar         │  · btn-primary submit │
└─────────────────────────────┴──────────────────────┘
Mobile (≤768px): stacks vertically, feature rows hidden.
```

**Key conventions:**
- All component styles live in an inline `<style>` tag inside the component — prefixed `lp-` to avoid collisions
- Animations use `cubic-bezier(0.22, 1, 0.36, 1)` ("snap into place") with staggered `animation-delay`
- Reuses `app-input` and `btn-primary` from `styles.css` — never duplicates them
- The ghost watermark (`FM`, 260px, Manrope 800, 6% opacity) is a deliberate brand detail — do not remove
- `@keyframes lp-spin` lives in `styles.css` (global) — all other `@keyframes` are inline
- Apply this same split-screen pattern to any future full-page auth/onboarding screens

---

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