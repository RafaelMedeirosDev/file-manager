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

## Filtering, sorting, and pagination belong in the database

Never fetch all records and filter in memory inside a use case.
Filtering (`where`), sorting (`orderBy`), and pagination (`skip`/`take`) must be expressed as Prisma query parameters inside the repository method.

The use case is responsible for:
- calculating `skip` from `page` and `limit`
- passing normalized filter values to the repository
- assembling the `{ data, meta }` response from the repository results

For lists that support search across multiple fields, use Prisma's `OR` operator — not multiple sibling `where` fields (which are AND).
Use the conditional spread pattern to keep the `where` clean when filters are optional.
Expose a separate `count()` method with the same `where` (without `skip`/`take`) to power `hasNextPage`.

Do this:
```ts
// Repository
listUsersActive(search?: string, skip?: number, take?: number): Promise<User[]> {
  return this.prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    skip,
    take,
  });
}

countActiveUsers(search?: string): Promise<number> {
  return this.prisma.user.count({
    where: {
      deletedAt: null,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
  });
}

// Use case
const skip = (page - 1) * limit;
const users = await this.userRepository.listUsersActive(search, skip, limit);
const total = await this.userRepository.countActiveUsers(search);
return { data: users.map(mapUser), meta: { page, limit, skip, hasNextPage: total > skip + limit } };
```

Avoid this:
```ts
// Never do in-memory filtering inside a use case
const all = await this.userRepository.findAll();
const filtered = all.filter(u => u.name.includes(search));
const page = filtered.slice(skip, skip + limit);
```

Preserve the API shape `{ data, meta }`.

## Soft delete
- `User`, `Folder`, `File`, `Exam`, and `ExamRequest` use `deletedAt`.
- Do not hard delete these records.
- Always treat `deletedAt` as inactive in use cases and queries.

## Schema and migrations
- Change `back-end/prisma/schema.prisma` first.
- If the API contract changes, update `shared/` exports and frontend consumers in the same task.
- Generate Prisma client or migrations only when the task actually changes schema or generated types.
