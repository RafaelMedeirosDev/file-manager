# NestJS Rules

Apply these rules when working in `back-end/`.

## File placement
- Controllers live in `back-end/src/controllers/`.
- DTOs live in `back-end/src/shared/dto/<domain>/`.
- Use cases live in `back-end/src/usecases/<domain>/`.
- Repositories live in `back-end/src/repositories/`.
- Register new providers and controllers in `back-end/src/app.module.ts` unless the code belongs in an existing dedicated module such as `auth/auth.module.ts`.

## Controllers
- Keep controllers thin: receive request data, validate it, pass it to one use case, return the use case output.
- Use `ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })` for DTO-backed `@Body`, `@Query`, and DTO `@Param`.
- Pull requester context from `req.user` when authorization depends on the caller.
- Do not inject repositories or `PrismaService` into controllers.

Do this:
```ts
return this.listFoldersUseCase.execute({
  requesterUserId: req.user.sub,
  requesterRole: req.user.role,
  page: query.page,
  limit: query.limit,
});
```

Avoid this:
```ts
const folders = await this.folderRepository.findAll();
return folders.filter((folder) => folder.userId === req.user.sub);
```

## DTOs
- Use `class-validator` and `class-transformer` on every external input.
- Trim user-entered strings with `@Transform`.
- Normalize emails with `trim().toLowerCase()`.
- Use `@IsOptional()` on optional fields and `@MaxLength(...)` on bounded strings.
- Keep DTOs focused on input shape. Domain rules such as uniqueness or ownership belong in the use case.

Do this:
```ts
@IsOptional()
@IsUUID()
folderId?: string;
```

Avoid this:
```ts
folderId?: any;
```

## Use cases
- Put business rules, ownership checks, soft-delete checks, sorting, pagination, and output mapping in the use case.
- Return explicit output objects instead of raw persistence records.
- Preserve the existing log pattern when editing use cases that already log `Execute started` and `Execute finished`.
- Keep branching readable; split private helpers only when they reduce duplication or clarify a rule.

## Auth and RBAC
- Keep `JwtAuthGuard`, `RolesGuard`, and `@Roles(...)` aligned with the current controller style.
- `ROLE.ADMIN` has full access unless the route says otherwise.
- `ROLE.USER` must stay constrained by route-level RBAC and ownership rules.
- The current API still accepts target `userId` in some admin-only DTOs. Do not silently rewrite that contract unless the task asks for it.

## Errors
- Use `ErrorMessagesEnum` instead of hard-coded strings.
- Throw the narrowest HTTP exception that matches the failure: `NotFoundException`, `ConflictException`, `ForbiddenException`, and so on.

Do this:
```ts
if (!folder || folder.deletedAt) {
  throw new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND);
}
```

Avoid this:
```ts
throw new Error('Folder not found');
```
