# Prisma Rules

Apply these rules when working on repositories, schema changes, or persistence-heavy use cases.

## Boundary
- Treat Prisma as infrastructure.
- Keep `PrismaService`, Prisma query details, and Prisma model types inside repositories whenever practical.
- Some legacy backend code still imports `ROLE` or model types outside repositories. Do not expand that pattern in new code.

## Mapping
- Map repository results to explicit use case outputs before returning them from business logic.
- Do not export `@prisma/client` model types or `Prisma.*GetPayload` types from use cases, controllers, `shared/`, or frontend code.
- Prefer `select` with named fields when the consumer does not need the whole record.

Do this:
```ts
const user = await this.userRepository.findById(id);
return { id: user.id, name: user.name, email: user.email };
```

Avoid this:
```ts
type UserOutput = User;
return user;
```

## Query design
- Keep repository methods small and readable.
- Avoid giant `include` trees unless the consumer truly needs all nested relations.
- If a query becomes hard to reason about, split it into explicit repository methods instead of building a generic data-access helper.

## Current pagination pattern
- For list endpoints in this project, repositories expose `findAll()` without `skip` or `take`.
- Filtering, soft-delete exclusion, sorting, and pagination happen in the use case.
- Preserve the API shape `{ data, meta }`.
- If a new list can grow large, flag the performance risk before copying the same in-memory pattern blindly.

## Soft delete
- `User`, `Folder`, `File`, `Exam`, and `ExamRequest` use `deletedAt`.
- Do not hard delete these records.
- Always treat `deletedAt` as inactive in use cases and queries.

## Schema and migrations
- Change `back-end/prisma/schema.prisma` first.
- If the API contract changes, update `shared/` exports and frontend consumers in the same task.
- Generate Prisma client or migrations only when the task actually changes schema or generated types.
