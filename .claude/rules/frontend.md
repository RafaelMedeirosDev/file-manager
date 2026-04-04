# Frontend Rules

Apply these rules when working in `front-end/`.

## Current structure
- Pages live in `front-end/src/pages/`.
- Feature logic lives in `front-end/src/features/<feature>/`.
- Shared helpers and types live in `front-end/src/shared/`.
- The Axios instance currently lives in `front-end/src/services/api.ts`.
- The project does not use React Query today; follow the existing hook and service pattern unless the task explicitly changes that.

## Boundaries
- Services perform HTTP only and return typed `response.data`.
- Hooks own request orchestration, async state, pagination, debouncing, and side effects.
- Components render UI from props.
- Pages should avoid direct `api.*` calls when a feature service exists.

Do this:
```ts
const raw = await usersService.list({ page, limit: 10 });
```

Avoid this:
```ts
const raw = await api.get('/users');
```

## Types and helpers
- Reuse `front-end/src/shared/types/` and `@file-manager/shared` exports before creating new local types.
- Keep UI-only view models in `front-end/src/shared/types/`.
- Reuse `front-end/src/shared/utils/apiUtils.ts` for API error and pagination normalization instead of duplicating helpers inside pages or hooks.

## State placement
- Put server and data state in feature hooks.
- Small ephemeral UI state can stay close to the page or component when it is only about rendering, toggles, or local form visibility.
- If a page starts owning fetching, retries, debouncing, or pagination, extract that logic into a hook.

## Styling
- Reuse `front-end/src/styles.css` primitives first: `app-card`, `app-input`, `btn-primary`, `btn-secondary`, `btn-danger`, `page-*`, and `users-*`.
- Preserve the existing visual language instead of creating a second design system.
- Keep highly page-specific animated styles local to that page when the current code already does that, such as `LoginPage.tsx`.

## Legacy areas
- `front-end/src/components`, `front-end/src/services`, and `front-end/src/types` still exist.
- Follow the local pattern when touching those files unless the task explicitly includes migration.
