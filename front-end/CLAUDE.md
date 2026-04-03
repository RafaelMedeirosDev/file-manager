# CLAUDE.md

## Stack
- React 18 + Vite + TypeScript
- Tailwind CSS (classes customizadas em styles.css: app-card, btn-primary, app-input, etc.)
- React Router v6
- Axios (instância em src/shared/lib/api.ts)
- SEM React Query por enquanto — estado local com useState/useCallback

## Arquitetura (Feature-Based)
src/
├── features/{feature}/
│   ├── components/   → UI pura, só recebe props
│   ├── hooks/        → lógica, estado, chamadas via service
│   └── services/     → APENAS chamadas HTTP, sem estado
├── shared/
│   ├── components/   → primitivos de UI reutilizáveis (ex: Modal)
│   ├── types/        → interfaces e types globais
│   ├── utils/        → funções puras reutilizáveis
│   └── lib/          → instância axios
└── pages/            → montam features, sem lógica própria

## Regras obrigatórias
1. Chamadas HTTP SEMPRE em services/ — nunca direto nas pages ou hooks
2. Lógica e estado SEMPRE em hooks/ — nunca dentro de componentes
3. Componentes recebem props e renderizam — sem api.get() dentro
4. Types globais ficam em shared/types/ — nunca redeclarar o mesmo type
5. Funções utilitárias reutilizáveis ficam em shared/utils/
6. Nunca usar `any` — tipar corretamente
7. Classes CSS customizadas já existem em styles.css — usar antes de criar novas

## Backend (já pronto)
- Base URL: http://localhost:3001
- Auth: Bearer token no header Authorization
- Paginação: { data: T[], meta: { page, limit, total, hasNextPage } }
- Soft delete: registros têm deletedAt
- Roles: ADMIN (tudo) | USER (listar + download)

## Endpoints principais
- POST /auth/login
- GET/POST/PATCH/DELETE /users
- PATCH /users/me/password
- GET/POST/PATCH/DELETE /folders
- GET/POST/PATCH/DELETE /files
- GET /files/:id/download
- GET /exams, POST /exams
- POST /exam-requests

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

## Users Page Layout Pattern — "Data Table"

`src/pages/UsersPage.tsx` uses a **data table layout** as the established SaaS pattern for team/user management.

```
┌─ Usuários ─────────────────────── [Minha senha] [+ Novo] ─┐
│  Gerencie contas, permissões e acesso ao workspace.        │
├────────────────────────────────────────────────────────────┤
│  🔍 Buscar por nome ou email...               N usuários   │  ← .users-panel
├────────────────────────────────────────────────────────────┤
│  USUÁRIO                         FUNÇÃO                    │  ← .users-table-head
├────────────────────────────────────────────────────────────┤
│▌ [AC] Ana Costa                  ██ Administrador          │  ← .user-row (hover reveals delete)
│       ana.costa@empresa.com                                │
│  [BL] Bruno Lima                 ░░ Usuário   [Excluir] ←  │
│  [CM] Carla Mendes               ░░ Usuário               │
└────────────────────────────────────────────────────────────┘
Mobile (≤640px): table head hidden, row collapses to 2-col grid, delete always visible.
```

**Key conventions:**
- All users live inside a single `.users-panel` (white rounded card) — no individual cards per row
- `.user-row` uses CSS grid `1fr 160px 100px`; left blue accent (`::before`) appears on hover
- Avatar colors generated from `name.charCodeAt(0) % 8` → 8 palette classes (`.av-blue`, `.av-indigo`, etc.)
- Avatar shape: `border-radius: 10px` squares, not circles
- Role badges: `.users-badge-admin` (filled blue) vs `.users-badge-user` (ghost/outline)
- Delete button `.users-btn-delete` is `opacity: 0` by default, revealed on `.user-row:hover`
- Rows animate in with staggered `animation-delay` via `users-row-in` keyframe
- Password change uses `<Modal>` from `src/shared/components/Modal.tsx` + `useChangePassword` hook — not an inline panel
- Search bar is integrated inside `.users-panel`, not a separate sticky toolbar

---

## 🚀 A Sequência de Trabalho com Claude Code

### Etapa 1 — Criar a infraestrutura shared (sem quebrar nada)
```
Leia o CLAUDE.md. Vamos começar pela infraestrutura shared.

Crie APENAS src/shared/types/index.ts com os types globais
que estão duplicados nas pages: FileItem, FolderItem, UserItem,
FolderDetails, FolderChild, ListResponse<T>, PaginatedMeta.

Não crie mais nenhum arquivo. Explique cada type e por que
ele deve ser compartilhado em vez de redeclarado por arquivo.
```

### Etapa 2 — Criar os utils compartilhados
```
Types aprovados. Agora crie APENAS src/shared/utils/apiUtils.ts com:
- getApiErrorMessage(error, fallback): string
- normalizePaginatedResponse<T>(payload, page, limit): PaginatedResult<T>

Essas funções existem copiadas em FoldersPage, FilesPage e UsersPage.
Explique por que isso é um problema e como centralizar resolve.
```

### Etapa 3 — Criar o primeiro service
```
Agora crie APENAS src/features/folders/services/foldersService.ts

Ele deve ter funções para todos os endpoints de /folders:
list, getById, create, update, softDelete.

Use a instância axios de src/shared/lib/api.ts.
Use os types de src/shared/types/index.ts.
Sem lógica de estado — só HTTP.
```

### Etapa 4 — Extrair o hook de useFolders
```
Service aprovado. Agora crie APENAS
src/features/folders/hooks/useFolders.ts

Extraia deste hook TODA a lógica que hoje está no FoldersPage:
- estado de folders, loading, error, paginação
- IntersectionObserver para scroll infinito
- handleCreateFolder
- handleSoftDeleteFolder

A FoldersPage vai virar só JSX que usa este hook.
Explique o que sai da Page e o que entra no hook.
```

### Etapa 5 — Limpar a Page
```
Hook aprovado. Agora refatore FoldersPage.tsx para que ela:
- Importe e use useFolders()
- Contenha APENAS JSX
- Não tenha nenhum useState ou useEffect próprio
- Não faça nenhuma chamada api.get() direta

Mostre antes e depois da quantidade de linhas.
```

---

## ⚡ Regras de Ouro para usar o Claude Code neste projeto

**Sempre comece a sessão assim:**
```
Leia o CLAUDE.md antes de qualquer coisa.
```

**Quando não entender algo, pergunte assim:**
```
Antes de criarmos o hook useFiles, me explica:
- Por que o hook não deve chamar api.get() diretamente?
- Qual é a diferença entre o que o service faz e o que o hook faz?
- O que acontece se eu colocar essa lógica direto no componente?
```

**Quando o Claude criar mais do que pediu:**
```
Você criou mais arquivos do que eu pedi.
Apague tudo que não foi solicitado e vamos fazer um arquivo por vez.
```

**Para revisar se seguiu a arquitetura:**
```
Revise todos os arquivos da feature folders e me diz
se algum está violando as regras do CLAUDE.md.
Liste os problemas antes de corrigir qualquer coisa.
```

## Skills (Plugin: boss-skills)

> Este projeto usa o plugin `boss-skills`. As skills são **OBRIGATÓRIAS** — não opcionais.
> Claude **DEVE** invocar a skill correspondente antes de escrever qualquer código.
> Nunca pule uma skill — elas definem os padrões de código e arquitetura do time.
>
> **Auto-ativação:** skills de engenharia ativam automaticamente por contexto (arquivo criado/modificado ou keyword detectada).
> **Skills disponíveis:** `eng-test`, `eng-solid`, `eng-dto`, `frontend-design`, `claudemd-sync`.
> **Após criar qualquer arquivo:** `eng-test` é mandatório.
> **Ao criar/modificar DTOs:** `eng-dto` é mandatório.
> **Ao criar/revisar UI:** `frontend-design` é mandatório.
> **Ao revisar SOLID:** `eng-solid` é mandatório.