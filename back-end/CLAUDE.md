# CLAUDE.md — Backend (NestJS)

## Stack
- NestJS 11 + TypeScript
- Prisma 7 (adapter pg — PostgreSQL)
- JWT (passport-jwt) + bcrypt
- class-validator + class-transformer (DTOs)
- @aws-sdk/client-s3 (Cloudflare R2)
- Multer (upload multipart)
- pnpm

## Arquitetura — Fluxo obrigatório
Controller → DTO → UseCase → Repository → Banco

Cada camada tem UMA responsabilidade. Nunca pule etapas.

## Estrutura de pastas
src/
├── auth/              → JWT strategy, guards, decorators
├── config/            → env.ts (validação de variáveis de ambiente)
├── controllers/       → recebem requisição, validam com DTO, chamam UseCase
├── database/          → PrismaModule, PrismaService
├── repositories/      → comunicação com banco via Prisma
├── shared/
│   ├── dto/           → validação de entrada separada por domínio
│   │   ├── auth/
│   │   ├── exam/
│   │   ├── exam-request/
│   │   ├── file/
│   │   ├── folder/
│   │   └── user/
│   ├── enums/         → ErrorMessagesEnum
│   ├── interceptors/  → HttpLoggingInterceptor
│   └── lib/           → r2Client.ts (S3Client para Cloudflare R2)
└── usecases/          → lógica de negócio separada por domínio
    ├── exam/
    ├── exam-request/
    ├── file/
    ├── folder/
    └── user/

## Regras obrigatórias

### Controllers
1. Apenas recebem a requisição e chamam o UseCase
2. Sempre usam ValidationPipe com transform, whitelist, forbidNonWhitelisted
3. Nunca contêm lógica de negócio
4. Sempre protegidos com JwtAuthGuard + RolesGuard
5. userId SEMPRE vem do JWT (req.user.sub) — nunca do body

### DTOs
6. Toda entrada de dados tem DTO com validações explícitas
7. Strings sempre têm @MaxLength
8. Campos opcionais têm @IsOptional
9. Emails têm @Transform para trim + toLowerCase
10. Nunca usar `any` no TypeScript

### UseCases
11. Contêm toda a lógica e regras de negócio
12. Fazem todas as validações de existência e permissão
13. Lançam exceções HTTP apropriadas (NotFoundException, ForbiddenException, etc.)
14. Sempre verificam soft delete: `if (!entity || entity.deletedAt)`
15. Sempre logam início e fim: `this.logger.log('[NomeUseCase] Execute started/finished')`
16. Upload: sempre fazer upload para R2 ANTES de salvar no banco

### Repositories
17. Apenas se comunicam com o banco via Prisma
18. Sem lógica de negócio — só queries
19. Soft delete: atualiza deletedAt, nunca deleta o registro

### Segurança
20. Roles: ADMIN tem acesso total | USER só acessa seus próprios recursos
21. Verificar ownership: `if (resource.userId !== requesterUserId && role !== ADMIN)`
22. Passwords: sempre bcrypt com SALT_ROUNDS = 10
23. Chaves R2: sempre UUID único `${randomUUID()}.${extension}`

## Modelos do banco (Prisma)

### User
- id (UUID), name, email (unique), password (bcrypt), role (ADMIN|USER)
- Soft delete: deletedAt

### Folder
- id (UUID), name, userId, folderId (nullable — pasta pai)
- Relações: parent/children (auto-referência), files
- Soft delete: deletedAt

### File
- id (UUID), name, userId, folderId (nullable), extension, url (R2 public URL)
- Soft delete: deletedAt

## Endpoints disponíveis

### Auth
- POST /auth/login → { accessToken, user }

### Users (ADMIN only, exceto me/password)
- GET    /users              → lista paginada com filtros name/email
- POST   /users              → cria user (role sempre USER)
- PATCH  /users/me/password  → troca própria senha (qualquer role)
- PATCH  /users/:id          → atualiza email/password
- DELETE /users/:id          → soft delete

### Folders (GET: ambos | POST/PATCH/DELETE: ADMIN)
- GET    /folders            → lista com rootsOnly, folderId, paginação
- GET    /folders/:id        → detalhes com parent, children, files
- POST   /folders            → cria pasta
- PATCH  /folders/:id        → atualiza nome
- DELETE /folders/:id        → soft delete

### Files (GET/download: ambos | POST/PATCH/DELETE: ADMIN)
- GET    /files              → lista com folderId, paginação
- GET    /files/:id          → detalhes com folder e relações
- GET    /files/:id/download → stream do arquivo (fetch da URL R2)
- POST   /files/upload       → upload multipart para R2 (ADMIN e USER)
- PATCH  /files/:id          → atualiza folderId/url
- DELETE /files/:id          → soft delete

### Exams (GET: ambos | POST: ADMIN)
- GET  /exams  → lista paginada com filtros name/code/category
- POST /exams  → cria exame (ADMIN only)

### ExamRequests (POST: ambos)
- POST /exam-requests → cria solicitação de exame (USER e ADMIN)

## Cloudflare R2
- SDK: @aws-sdk/client-s3 (compatível com API S3)
- Client: src/shared/lib/r2Client.ts
- Variáveis: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
             R2_BUCKET_NAME, R2_ENDPOINT, R2_PUBLIC_URL
- Chave do objeto: {uuid}.{extension}
- URL pública: {R2_PUBLIC_URL}/{chave}

## Variáveis de ambiente obrigatórias
DATABASE_URL, DATABASE_SCHEMA, JWT_SECRET, PORT, NODE_ENV,
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
R2_BUCKET_NAME, R2_ENDPOINT, R2_PUBLIC_URL

## Padrão de paginação

Todas as rotas de listagem seguem este padrão:

### QueryDTO
```ts
@IsOptional() @Transform(parseInt) @IsInt() @Min(1) page?: number;         // default 1
@IsOptional() @Transform(parseInt) @IsInt() @Min(1) @Max(100) limit?: number; // default 10
// + filtros opcionais do domínio (name, code, category, etc.)
```

### UseCase
```ts
const page = input?.page ?? 1;
const limit = input?.limit ?? 10;
const all = await this.repository.findAll();
const filtered = all.filter(item => !item.deletedAt && /* filtros */);
const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
const total = sorted.length;
const start = (page - 1) * limit;
return {
  data: sorted.slice(start, start + limit).map(/* shape */),
  meta: { page, limit, total, hasNextPage: start + limit < total },
};
```

### Repository
`findAll()` retorna todos os registros sem filtro — sem `skip`/`take` no Prisma.
Toda filtragem e paginação ocorre em memória no UseCase.

### Output shape (padrão obrigatório)
```ts
{ data: T[], meta: { page: number, limit: number, total: number, hasNextPage: boolean } }
```

## Padrão de erro
Sempre usar ErrorMessagesEnum para mensagens de erro.
Nunca lançar strings literais nas exceções.

## Testes
- E2E de RBAC: test/rbac.e2e-spec.ts
- Cobre permissões de USER e ADMIN em todos os endpoints