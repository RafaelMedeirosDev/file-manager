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
- There is no dedicated frontend test script configured right now.
- Still write frontend code so it stays testable: keep HTTP in services, branching in hooks or utils, and rendering mostly in components.
- If the task explicitly requires frontend tests, say which tooling must be added or reused before creating files that cannot be run.

## Useful commands
- `pnpm --dir back-end test`
- `pnpm --dir back-end test:e2e`
- `pnpm --dir front-end build`
- `pnpm test`
