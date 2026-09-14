# Test Rules

Use this file when changing behavior, fixing bugs, or reviewing coverage gaps.

## Expectations
- New business rule -> add or update a unit test near the touched backend use case.
- Bugfix -> add a test that reproduces the failure when practical.
- RBAC, guards, or HTTP contract changes -> update `back-end/test/*.e2e-spec.ts`.
- If you cannot add or run a test, state that gap explicitly.

## Backend
- Unit specs live beside use cases in `back-end/src/usecases/**/**/*.spec.ts`.
- E2E tests live in `back-end/test/`.
- Mock repositories or external services at the seam.
- Avoid excessive mocks that make the test harder to read than the production code.
- Assert on behavior and returned shape, not private implementation details.

Do this:
```ts
findAll.mockResolvedValue(users);
const output = await useCase.execute({ search: 'ana' });
expect(output.meta.total).toBe(3);
```

Avoid this:
```ts
expect(logger.log).toHaveBeenCalledTimes(2);
```

## Frontend
- Vitest 3 + Testing Library. Config in the `test` block of `front-end/vite.config.ts`; setup in `front-end/src/test/setup.ts`.
- Specs are `*.spec.ts(x)` **colocated** beside the code, mirroring the backend.
- `globals: false` — import `{ describe, it, expect, vi }` from `'vitest'` in every spec.
- `jsdom` is the default environment. Add `// @vitest-environment node` at the top of specs that touch no DOM.
- Mock at the service seam with `vi.spyOn(service, 'method')`. Let `AuthProvider` and `react-router` run for real.
- `vi.spyOn(obj, 'name')` is also what keeps `@typescript-eslint/unbound-method` quiet: it takes the method as a string, so no unbound member reference is created. `expect(service.method).toHaveBeenCalled()` is a lint **error**.
- `await` every `user.*` call and every `waitFor` — `no-floating-promises` is a warning, and `lint:ci` runs with `--max-warnings 0`.
- Prefer `user-event` over `fireEvent`: `fireEvent` dispatches on `disabled` controls, which silently passes over real bugs.
- Assert navigation by what rendered after it, not by a mocked `navigate`.

Do this:
```ts
const login = vi.spyOn(authService, 'login').mockResolvedValue(authenticated);
expect(login).toHaveBeenCalledWith({ email, password });
```

Avoid this:
```ts
expect(authService.login).toHaveBeenCalled(); // unbound-method: erro de lint
```

## Useful commands
- `pnpm --dir back-end test`
- `pnpm --dir back-end test:e2e`
- `pnpm --dir front-end test`
- `pnpm --dir front-end test:watch`
- `pnpm --dir front-end build`
- `pnpm test`
