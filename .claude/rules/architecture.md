# Architecture Rules

Use this file for changes that cross layers or packages.

## Package boundaries
- Keep `back-end/`, `front-end/`, and `shared/` loosely coupled.
- Put code in `shared/` only when it defines a stable contract or enum reused by more than one workspace.
- Do not import backend internals into the frontend or frontend code into the backend.

## Backend flow
- Follow `controller -> DTO -> use case -> repository`.
- Controllers handle transport only.
- DTOs validate transport shape only.
- Use cases hold business rules, ownership checks, filtering, sorting, pagination, and output mapping.
- Repositories talk to Prisma only.

Do this:
```ts
return this.listUsersUseCase.execute({ page: query.page, limit: query.limit });
```

Avoid this:
```ts
const users = await this.prisma.user.findMany();
return users.filter(...);
```

## Frontend flow
- Prefer `page/layout -> hook -> service -> API`.
- Services own HTTP calls.
- Hooks own async state, pagination, debouncing, and side effects.
- Components and pages should mostly compose UI and call hooks.

Do this:
```ts
const { users, loading } = useUsers();
```

Avoid this:
```ts
const users = await api.get('/users');
```

## Shared contracts
- Prefer `@file-manager/shared` for enums and response contracts that must stay aligned across apps.
- Keep UI-only types in `front-end/src/shared/types/`.
- Keep backend-only DTOs and repository input types inside the backend.

## Change strategy
- Respect the current structure before proposing migrations.
- If a file already lives in a legacy area such as `front-end/src/components`, `front-end/src/services`, or `front-end/src/types`, edit it in place unless the task explicitly includes migration.
- Prefer local extraction over wide refactors during bugfixes.

Do this:
```ts
export const usersService = { list: () => api.get('/users').then((r) => r.data) };
```

Avoid this:
```ts
export function fetchUsers() {}
export function fetchFolders() {}
export function fetchAnything() {}
```
