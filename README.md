# File Manager

Aplicação full stack em TypeScript para gestão de arquivos por usuário, organizada como um monorepo com API REST em NestJS, SPA em React e um pacote de contratos compartilhados entre as duas pontas.

| Pacote | Stack | Porta padrão |
|---|---|---|
| `back-end/` | NestJS 11 + Prisma 7 + PostgreSQL | `3000` (via `PORT`) |
| `front-end/` | React 18 + Vite 5 | `5173` |
| `shared/` | `@file-manager/shared` — enums e contratos de API | — |

---

## Sobre o projeto

O **File Manager** é uma aplicação web que centraliza o armazenamento e a organização de documentos por usuário, com controle de acesso por papéis e persistência dos arquivos em armazenamento de objetos na nuvem.

O problema que ele resolve: em operações onde cada cliente/usuário possui um conjunto próprio de documentos, é comum que os arquivos fiquem espalhados em e-mails, drives pessoais e pastas locais, sem controle de quem acessa o quê. O File Manager oferece uma hierarquia de pastas por usuário, uma pasta padrão criada automaticamente no cadastro, upload e download autenticados, e regras explícitas de permissão em cada rota da API.

Além do núcleo de arquivos, o projeto implementa um segundo domínio voltado a **exames laboratoriais**: um catálogo de exames classificados por categoria e um fluxo de solicitação de exames vinculado a um usuário, com geração de PDF da solicitação no frontend. Esse módulo indica que a aplicação foi construída no contexto de um laboratório ou clínica, onde a gestão documental e a solicitação de exames convivem no mesmo sistema.

Trata-se de um **monorepo full stack**: backend (API REST), frontend (SPA) e um pacote compartilhado convivem no mesmo repositório, gerenciados por pnpm workspaces e Turborepo.

---

## Principais funcionalidades

### Autenticação e controle de acesso
- Login por e-mail e senha com emissão de **JWT** (validade de 1 dia).
- Senhas armazenadas com hash **bcrypt** (10 salt rounds).
- Dois papéis: `ADMIN` e `USER`, aplicados por rota através de guards e do decorator `@Roles(...)`.
- Usuários com `deletedAt` preenchido são bloqueados no login.

### Gestão de usuários
- Listagem paginada com busca por nome e e-mail (executada no banco).
- Criação de usuário com criação simultânea de pastas: uma pasta padrão com o nome do usuário (`isDefault`) e, opcionalmente, uma lista de pastas adicionais, ignorando nomes duplicados.
- Atualização de dados e **soft delete**.
- Troca da própria senha (`PATCH /users/me/password`), disponível para `ADMIN` e `USER`, com validação da senha atual.

### Gestão de pastas
- Hierarquia de pastas com auto-relacionamento (pasta pai → subpastas), com profundidade arbitrária.
- Listagem paginada, com filtro por pasta pai e por raízes.
- Detalhe de pasta retornando ancestrais (breadcrumb), pai, subpastas e arquivos em uma única resposta.
- Criação de um mesmo conjunto de pastas para vários usuários de uma vez (assistente em etapas no frontend).
- **Soft delete**.

### Gestão de arquivos
- **Upload individual** e **upload múltiplo** (até 20 arquivos por requisição), com relatório por arquivo em caso de falha parcial no lote.
- Persistência do binário no **Cloudflare R2** e dos metadados no PostgreSQL.
- **Download autenticado** com streaming pela API, `Content-Type` resolvido por extensão e timeout de 15 segundos na origem.
- Listagem paginada, consulta por ID e **soft delete**.
- Regra de escrita: `ADMIN` pode enviar arquivos para qualquer pasta; `USER` só pode enviar para a própria pasta padrão.

### Exames e solicitações
- Catálogo de exames com código único e categorização em 8 categorias (`THROMBOPHILIA`, `MICROBIOLOGY`, `ENDOCRINE_METABOLIC`, `IMMUNOLOGY`, `OBSTETRIC_MARKERS`, `IMAGING`, `BIOCHEMISTRY`, `HEMATOLOGY`).
- Criação, listagem paginada e **soft delete** de exames.
- Solicitações de exames vinculadas a um usuário, com múltiplos exames por solicitação (relação N–N) e campo de indicação clínica.
- Assistente de criação em 4 etapas no frontend e **geração de PDF** da solicitação com jsPDF.

### Características transversais
- **Soft delete em todas as entidades** — não existe exclusão física de registros no backend.
- **Paginação, filtro e ordenação executados no banco de dados** (`where` / `skip` / `take` no repositório), com resposta padronizada `{ data, meta }`.
- Validação de todo input externo com `class-validator` e `class-transformer` via DTOs.
- Interceptor global de log HTTP (método, rota, status, usuário, IP e duração).
- Níveis de log configuráveis por variável de ambiente.

---

## Tecnologias utilizadas

### Backend
- **NestJS 11** (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`)
- **TypeScript 5.7**
- **Prisma 7** (`@prisma/client`, `prisma`) com driver adapter `@prisma/adapter-pg` sobre `pg`
- **`@nestjs/jwt`** + **Passport** (`@nestjs/passport`, `passport`, `passport-jwt`) para autenticação JWT
- **bcrypt** para hash de senhas
- **class-validator** e **class-transformer** para validação e transformação de DTOs
- **`@aws-sdk/client-s3`** como cliente de armazenamento de objetos
- **Multer** (via `FileInterceptor` / `FilesInterceptor` do `@nestjs/platform-express`) para multipart/form-data
- **dotenv** para carregamento de variáveis de ambiente
- **ESLint 9** (flat config, `typescript-eslint` com `recommendedTypeChecked`) e **Prettier**

### Frontend
- **React 18** + **React DOM 18**
- **Vite 5** (`@vitejs/plugin-react`)
- **TypeScript 5.7** em modo `strict`
- **React Router 6** (`createBrowserRouter`)
- **Axios** com instância única e interceptor de requisição para injeção do token
- **Tailwind CSS 3** + **PostCSS** + **Autoprefixer**, complementados por um conjunto próprio de classes de componente em `src/styles.css`
- **jsPDF** para geração do PDF de solicitação de exames
- **serve** para servir o build estático em produção

### Banco de dados
- **PostgreSQL** como provider do datasource.
- **Prisma ORM** como camada de acesso, com **Prisma Migrate** — o histórico conta com **10 migrations** versionadas em `back-end/prisma/migrations/`.
- Modelagem relacional com 5 entidades, chaves primárias em **UUID**, colunas e tabelas em `snake_case` via `@map`/`@@map`, e timestamps (`created_at`, `updated_at`) e soft delete (`deleted_at`) em todas as tabelas.
- A conexão é injetada em tempo de execução pelo **driver adapter** (`PrismaPg` sobre um `Pool` do `pg`), incluindo a seleção do schema — o bloco `datasource` do schema não declara `url`.

### Monorepo e ferramentas
- **pnpm 10** com workspaces (`back-end`, `front-end`, `shared`).
- **Turborepo 2** orquestrando as tasks `build`, `lint`, `format`, `test`, `test:e2e`, `dev`, `start:dev` e as tasks de Prisma, com cache e dependências entre pacotes (`dependsOn: ["^build"]`).
- **`@file-manager/shared`**: pacote interno compilado com `tsc` que centraliza enums (`Role`, `ExamCategory`, `ErrorMessagesEnum`) e contratos de API (`ListResponse<T>`, `PaginatedMeta`, `UserItem`, `FolderItem`, `FolderDetails`, `FileItem`, `ExamItem`, `ExamRequestItem`), consumidos pelos dois lados.
- ESLint e Prettier estão configurados no `back-end/`. O `front-end/` ainda não possui configuração própria de lint/format.

### Armazenamento externo
- **Cloudflare R2**, acessado pela API compatível com S3 através do `@aws-sdk/client-s3`.
- O cliente é instanciado em `back-end/src/shared/lib/r2Client.ts` com `region: 'auto'` e endpoint montado a partir de `R2_ACCOUNT_ID`.
- O upload usa `PutObjectCommand`; o download é feito via HTTP a partir da URL pública armazenada, sem uso de URLs pré-assinadas.

### Testes
- **Jest 30** + **ts-jest** para testes unitários no backend (9 arquivos `*.spec.ts`, concentrados nos use cases de listagem e no domínio de solicitações de exames).
- **Supertest 7** + **`@nestjs/testing`** para testes end-to-end (2 arquivos em `back-end/test/`), incluindo uma suíte dedicada a **RBAC** que valida os códigos 403/200/201 por papel nas rotas de usuários, pastas e arquivos.
- Não há suíte de testes no frontend nem no pacote `shared/`.

---

## Arquitetura do projeto

### Visão geral do monorepo

| Pasta | Responsabilidade |
|---|---|
| `back-end/` | API REST em NestJS, camada de persistência com Prisma e integração com o armazenamento de objetos. |
| `front-end/` | SPA em React consumindo a API; organizada por features. |
| `shared/` | Pacote `@file-manager/shared` com enums e contratos de resposta usados por backend e frontend. Fonte única de verdade para os tipos que atravessam a fronteira HTTP. |
| `back-end/prisma/` | Schema, migrations e configuração do Prisma. |

### Arquitetura do backend

O fluxo segue a cadeia **`controller → DTO → use case → repository`**, com responsabilidades estritas:

- **Controllers** (`src/controllers/`, 5 arquivos) — apenas transporte: recebem a requisição, aplicam `ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })` no parâmetro, extraem o contexto do requisitante de `req.user` e delegam para um único use case.
- **DTOs** (`src/shared/dto/<domínio>/`) — validam exclusivamente o formato do input com `class-validator`, normalizam strings (`trim`) e e-mails (`trim().toLowerCase()`).
- **Use cases** (`src/usecases/<domínio>/`, 26 arquivos) — concentram as regras de negócio: verificação de propriedade, checagem de soft delete, cálculo de paginação, montagem do `meta` e mapeamento explícito para o objeto de saída. Nunca retornam registros crus do Prisma.
- **Repositories** (`src/repositories/`, 5 arquivos) — única camada que fala com o Prisma. Expõem métodos específicos (`listUsersActive`, `countActiveUsers`, `findActiveByUserIdAndName`, `softDeleteById`) em vez de um acesso genérico ao ORM.
- **Auth** (`src/auth/`) — módulo isolado com `AuthService`, `JwtStrategy`, `JwtAuthGuard`, `RolesGuard` e o decorator `@Roles`.
- **Infra transversal** — `src/database/` (módulo global do Prisma), `src/config/env.ts` (validação centralizada de variáveis de ambiente na inicialização), `src/shared/interceptors/` (log HTTP) e `src/shared/lib/` (cliente R2).

Os providers e controllers são registrados em `src/app.module.ts`; a autenticação permanece encapsulada em `src/auth/auth.module.ts`.

### Arquitetura do frontend

O fluxo segue **`page/layout → hook → service → API`**:

- **`src/app/`** — composição da aplicação: `App.tsx` (provider de autenticação + router), `router.tsx` (definição das rotas), `guards/ProtectedRoute.tsx` (proteção por autenticação e por papel) e `layouts/AppLayout.tsx` (shell com topbar e sidebar).
- **`src/features/<feature>/`** — organização por domínio (`auth`, `users`, `folders`, `exams`, `exam-requests`). Cada feature reúne seus **hooks** (estado assíncrono, paginação, scroll infinito, orquestração de requisições), seus **services** (chamadas HTTP tipadas retornando `response.data`), e, quando necessário, contexts, components e utils próprios.
- **`src/pages/`** — composição visual das telas a partir dos hooks; assistentes em múltiplas etapas para criação de usuário, criação de pastas em lote e solicitação de exames.
- **`src/services/api.ts`** — instância única do Axios, com `baseURL` vinda de `VITE_API_URL` e interceptor que injeta o header `Authorization: Bearer <token>` a partir da sessão em `localStorage`.
- **`src/shared/`** — componentes reutilizáveis (`Modal`), tipos de view e utilitários de normalização de erro e de resposta paginada (`getApiErrorMessage`, `normalizePaginatedResponse`).

Rotas registradas:

| Rota | Proteção |
|---|---|
| `/login` | pública |
| `/` | autenticado (redireciona `ADMIN` → `/users`, `USER` → `/folders`) |
| `/folders`, `/folders/:id`, `/files` | autenticado |
| `/users`, `/users/new` | `ADMIN` |
| `/folders/new` | `ADMIN` |
| `/exams` | `ADMIN` |
| `/exam-requests`, `/exam-requests/new` | `ADMIN` |

---

## Estrutura de pastas

```
file-manager/
├── back-end/
│   ├── prisma/
│   │   ├── migrations/           # 10 migrations versionadas
│   │   └── schema.prisma
│   ├── src/
│   │   ├── auth/                 # AuthService, JwtStrategy, guards, @Roles
│   │   ├── config/               # env.ts — validação das variáveis de ambiente
│   │   ├── controllers/          # User, Folder, File, Exam, ExamRequest
│   │   ├── database/             # PrismaModule (global) + PrismaService
│   │   ├── repositories/         # única camada que acessa o Prisma
│   │   ├── shared/
│   │   │   ├── constants/
│   │   │   ├── dto/              # DTOs por domínio
│   │   │   ├── interceptors/     # HttpLoggingInterceptor
│   │   │   └── lib/              # r2Client
│   │   ├── usecases/             # exam, exam-request, file, folder, user
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── test/                     # testes e2e (app, rbac)
│
├── front-end/
│   └── src/
│       ├── app/                  # App, router, guards, layouts
│       ├── components/           # componentes globais (Sidebar, Icons)
│       ├── features/             # auth, users, folders, exams, exam-requests
│       │   └── <feature>/        # hooks/ services/ components/ contexts/ utils/
│       ├── pages/                # telas
│       ├── services/             # api.ts (instância Axios)
│       ├── shared/               # components, types, utils
│       └── styles.css            # design system em CSS + camadas Tailwind
│
├── shared/
│   └── src/
│       ├── enums/                # Role, ExamCategory, ErrorMessagesEnum
│       ├── types/                # contratos de API (api, user, folder, file, exam...)
│       └── index.ts
│
├── package.json                  # scripts orquestrados pelo Turbo
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Modelagem de dados

Definida em [back-end/prisma/schema.prisma](back-end/prisma/schema.prisma). Provider: PostgreSQL.

### Entidades

| Modelo | Tabela | Descrição |
|---|---|---|
| `User` | `users` | Usuário do sistema. Campos: `id` (UUID), `name`, `email` (único), `password` (hash bcrypt), `role`. |
| `Folder` | `folders` | Pasta pertencente a um usuário. Possui `folderId` opcional para auto-relacionamento (pasta pai) e a flag `isDefault`, que marca a pasta padrão criada junto com o usuário. |
| `File` | `files` | Metadados do arquivo: `name`, `extension`, `url` (endereço público no R2), `userId` e `folderId` opcional. O binário não é armazenado no banco. |
| `Exam` | `exams` | Item do catálogo de exames: `name`, `code` (único) e `category` (enum `ExamCategory`). |
| `ExamRequest` | `exam_requests` | Solicitação de exames vinculada a um usuário, com o campo textual `indication` e uma coleção de exames. |

### Enums

- **`ROLE`** — `ADMIN`, `USER`.
- **`ExamCategory`** — `THROMBOPHILIA`, `MICROBIOLOGY`, `ENDOCRINE_METABOLIC`, `IMMUNOLOGY`, `OBSTETRIC_MARKERS`, `IMAGING`, `BIOCHEMISTRY`, `HEMATOLOGY`.

### Relacionamentos

| Relação | Cardinalidade | Regra no banco |
|---|---|---|
| `User` → `Folder` | 1–N (obrigatória) | `ON DELETE RESTRICT` |
| `User` → `File` | 1–N (obrigatória) | `ON DELETE RESTRICT` |
| `User` → `ExamRequest` | 1–N (obrigatória) | `ON DELETE RESTRICT` |
| `Folder` → `Folder` (`FolderToFolder`) | 1–N (auto-relação, opcional) | `ON DELETE SET NULL` |
| `Folder` → `File` | 1–N (opcional) | `ON DELETE SET NULL` |
| `Exam` ↔ `ExamRequest` | N–N | tabela de junção implícita `_ExamToExamRequest`, `ON DELETE CASCADE` |

Pastas raiz são identificadas por `folder_id IS NULL`, o que permite navegação hierárquica em profundidade arbitrária.

### Convenções aplicadas

- **UUID** como chave primária em todos os modelos (`@default(uuid()) @db.Uuid`).
- **Timestamps**: `created_at` com `@default(now())` e `updated_at` com `@default(now()) @updatedAt`.
- **Soft delete**: coluna `deleted_at` (nullable) em todas as 5 tabelas. As consultas de listagem filtram `deletedAt: null` diretamente no repositório, e os use cases rejeitam registros marcados como excluídos com `NotFoundException`.
- **Restrições de unicidade**: `users.email` e `exams.code`.
- **Nomenclatura**: modelos em `PascalCase` no Prisma, tabelas e colunas em `snake_case` no banco via `@map` e `@@map`.

> Não há script de seed no projeto.

---

## Autenticação e autorização

### Fluxo de login

1. `POST /auth/login` recebe `email` e `password` validados por DTO.
2. O `AuthService` busca o usuário por e-mail e rejeita a tentativa caso o usuário não exista **ou** esteja marcado como excluído (`deletedAt`).
3. A senha é comparada com o hash armazenado usando `bcrypt.compare`.
4. Em caso de falha, é lançada uma `UnauthorizedException` com mensagem genérica — a resposta não distingue e-mail inexistente de senha incorreta.
5. Em caso de sucesso, é assinado um JWT com o payload `{ sub, email, role }` e retornado `{ accessToken, user: { id, name, email, role } }`.

O token tem validade de **1 dia** e é assinado com `JWT_SECRET`. **Não há refresh token** — expirado o token, o usuário precisa autenticar novamente.

### Guards e papéis

- **`JwtAuthGuard`** — estende `AuthGuard('jwt')`. A `JwtStrategy` extrai o token do header `Authorization: Bearer`, valida a expiração e disponibiliza o payload em `req.user`.
- **`RolesGuard`** — lê os papéis exigidos com `Reflector.getAllAndOverride`, de modo que um `@Roles(...)` no handler **sobrescreve** o do controller. Sem metadata de papéis, a rota é liberada para qualquer usuário autenticado; sem `req.user`, o acesso é negado.
- **`@Roles(ROLE.ADMIN, ROLE.USER)`** — decorator que declara os papéis permitidos por rota.

Os guards são aplicados por controller com `@UseGuards(JwtAuthGuard, RolesGuard)`; não há guard global registrado.

### Matriz de permissões por rota

| Método | Rota | Papel exigido |
|---|---|---|
| `POST` | `/auth/login` | pública |
| `GET` | `/users` | `ADMIN` |
| `POST` | `/users` | `ADMIN` |
| `PATCH` | `/users/me/password` | `ADMIN`, `USER` |
| `PATCH` | `/users/:id` | `ADMIN` |
| `DELETE` | `/users/:id` | `ADMIN` |
| `GET` | `/folders` | `ADMIN`, `USER` |
| `GET` | `/folders/:id` | `ADMIN`, `USER` |
| `POST` | `/folders` | `ADMIN` |
| `PATCH` | `/folders/:id` | `ADMIN` |
| `DELETE` | `/folders/:id` | `ADMIN` |
| `POST` | `/files/upload` | `ADMIN`, `USER` |
| `POST` | `/files/bulk-upload` | `ADMIN`, `USER` |
| `GET` | `/files` | `ADMIN`, `USER` |
| `GET` | `/files/:id` | `ADMIN`, `USER` |
| `GET` | `/files/:id/download` | `ADMIN`, `USER` |
| `POST` | `/files` | `ADMIN` |
| `PATCH` | `/files/:id` | `ADMIN` |
| `DELETE` | `/files/:id` | `ADMIN`, `USER` |
| `GET` | `/exams` | `ADMIN`, `USER` |
| `POST` | `/exams` | `ADMIN` |
| `DELETE` | `/exams/:id` | `ADMIN` |
| `GET` | `/exam-requests` | `ADMIN` |
| `GET` | `/exam-requests/:id` | `ADMIN` |
| `POST` | `/exam-requests` | `ADMIN`, `USER` |
| `PATCH` | `/exam-requests/:id` | `ADMIN` |

O RBAC não para no guard: os use cases aplicam verificações adicionais de propriedade. Um `USER` só lê e remove arquivos que lhe pertencem, só envia arquivos para a própria pasta padrão, e ao criar uma solicitação de exames tem o `userId` forçado para o seu próprio identificador — apenas um `ADMIN` pode informar um usuário-alvo diferente.

### No frontend

A sessão (`accessToken` + dados do usuário) é persistida em `localStorage` sob a chave `file-manager:session` e exposta pelo `AuthProvider`. O interceptor de requisição do Axios injeta o header `Authorization` automaticamente. O componente `ProtectedRoute` redireciona para `/login` quando não há sessão e para `/` quando o papel do usuário não está entre os permitidos para a rota.

---

## Upload e armazenamento de arquivos

### Recebimento

Os endpoints de upload usam os interceptors do `@nestjs/platform-express` sobre o Multer:

- `POST /files/upload` → `FileInterceptor('file')` — um arquivo por requisição.
- `POST /files/bulk-upload` → `FilesInterceptor('files', 20)` — até 20 arquivos por requisição.

Os arquivos são recebidos **em memória** (o buffer é lido diretamente de `file.buffer`); não há gravação em disco no servidor. Não há limite de tamanho configurado por arquivo — apenas o limite de quantidade no lote.

### Regras de negócio antes da escrita

Implementadas em `UploadFileUseCase` e `BulkUploadFilesUseCase`:

1. A pasta de destino precisa existir e não estar excluída, caso contrário → `NotFoundException`.
2. Se o requisitante é `ADMIN`, o upload é permitido em qualquer pasta e o **dono do arquivo passa a ser o dono da pasta**.
3. Se o requisitante é `USER`, a pasta precisa pertencer a ele **e** ser a pasta padrão (`isDefault`), caso contrário → `BadRequestException`.
4. O dono resolvido precisa existir e não estar excluído.

No upload em lote, a validação da pasta acontece uma única vez e cada arquivo é processado individualmente: falhas isoladas são capturadas e devolvidas na resposta com `{ name, extension, error }`, sem abortar o lote inteiro.

### Persistência do binário

O armazenamento é o **Cloudflare R2**, acessado pela API compatível com S3:

```ts
// back-end/src/shared/lib/r2Client.ts
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
```

O objeto é enviado com `PutObjectCommand` usando uma chave gerada por `randomUUID()` acrescida da extensão original, o que evita colisões e desvincula o nome público do nome informado pelo usuário. O `ContentType` é preservado a partir do mimetype recebido.

### Persistência dos metadados

Após o envio ao R2, é criado um registro na tabela `files` com `name`, `userId`, `folderId`, `extension` e `url`, sendo a URL montada como `${R2_PUBLIC_URL}/${key}`. O binário nunca é gravado no PostgreSQL.

### Download

`GET /files/:id/download` é servido pela própria API, e não por redirecionamento:

- Um requisitante que não seja `ADMIN` precisa ser o dono do arquivo.
- A URL armazenada é validada (precisa ser `http:` ou `https:`) e requisitada com `fetch` sob um `AbortController` com timeout de **15 segundos**.
- A resposta é devolvida como `StreamableFile` a partir de `Readable.fromWeb`, com `Content-Type` resolvido por um mapa de extensões conhecidas (xlsx, xls, pdf, csv, txt, json, zip, png, jpg, jpeg) e fallback para `application/octet-stream`, além de `Content-Length` e `Content-Disposition`.
- Falhas de origem são traduzidas em `GatewayTimeoutException` ou `BadGatewayException`.

> **Observações honestas sobre o estado atual:** não são usadas URLs pré-assinadas — o download depende de o objeto ser publicamente legível através de `R2_PUBLIC_URL`. Além disso, o soft delete de um arquivo remove apenas o registro lógico no banco; o objeto correspondente permanece no bucket.

---

## Como executar o projeto

### 1. Pré-requisitos

- **Node.js 20+**
- **pnpm 10+** (o repositório fixa `pnpm@10.19.0` no campo `packageManager`)
- **PostgreSQL** acessível
- Um bucket **Cloudflare R2** com credenciais de acesso

### 2. Clonar o repositório

```bash
git clone https://github.com/RafaelMedeirosDev/file-manager.git
cd file-manager
```

### 3. Instalar as dependências

```bash
pnpm install
```

O script `prepare` do pacote `shared/` compila automaticamente `shared/dist/` durante a instalação — não é necessário nenhum passo manual em um clone novo.

### 4. Configurar as variáveis de ambiente

```bash
cp back-end/.env.example back-end/.env
cp front-end/.env.example front-end/.env
```

Preencha os valores conforme a seção [Variáveis de ambiente](#variáveis-de-ambiente). A aplicação valida as variáveis obrigatórias na inicialização e falha imediatamente com uma mensagem explícita caso alguma esteja ausente.

### 5. Gerar o Prisma Client

```bash
pnpm prisma:generate
```

### 6. Executar as migrations

```bash
pnpm prisma:migrate:dev
```

Em ambientes de produção, use `pnpm prisma:migrate:deploy`.

> O projeto não possui script de seed. O primeiro usuário `ADMIN` precisa ser criado manualmente no banco (a criação de usuários pela API é uma rota restrita a `ADMIN`).

### 7. Executar em desenvolvimento

Ambos os serviços em paralelo:

```bash
pnpm dev
```

Ou individualmente:

```bash
pnpm start:dev     # apenas a API, em modo watch
pnpm start:front   # apenas o frontend (Vite, porta 5173)
```

### 8. Build de produção

```bash
pnpm build          # todos os workspaces via Turbo (shared → back-end → front-end)
pnpm build:back     # apenas o backend
pnpm build:front    # apenas o frontend
```

### 9. Executar os testes

```bash
pnpm test                       # testes unitários (atualmente apenas o back-end possui suíte)
pnpm --dir back-end test:e2e    # testes end-to-end do backend
pnpm --dir back-end test:cov    # relatório de cobertura
```

> Após alterar qualquer arquivo em `shared/src/`, execute `pnpm --dir shared build` antes de subir os servidores ou rodar os testes.

---

## Variáveis de ambiente

### Backend — `back-end/.env`

```env
# Database
DATABASE_URL=
DATABASE_SCHEMA=

# JWT
JWT_SECRET=

# App
PORT=3000
NODE_ENV=development
LOG_LEVELS=log,error,warn

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
R2_PUBLIC_URL=
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | String de conexão do PostgreSQL. |
| `DATABASE_SCHEMA` | Não | Schema usado pelo driver adapter do Prisma. Se omitida, as queries usam o `search_path` padrão da conexão — `public`, no PostgreSQL. |
| `JWT_SECRET` | Sim | Segredo usado para assinar e verificar os tokens JWT. |
| `PORT` | Não | Porta da API. Valor padrão no código: `3000`. |
| `NODE_ENV` | Não | Ambiente de execução. Padrão: `development`. |
| `LOG_LEVELS` | Não | Lista separada por vírgula entre `log`, `error`, `warn`, `debug`, `verbose`, `fatal`. Padrão: `log,error,warn`. |
| `R2_ACCOUNT_ID` | Sim | Account ID do Cloudflare R2 — usado para montar o endpoint do cliente S3. |
| `R2_ACCESS_KEY_ID` | Sim | Access key de acesso ao bucket. |
| `R2_SECRET_ACCESS_KEY` | Sim | Secret key de acesso ao bucket. |
| `R2_BUCKET_NAME` | Sim | Nome do bucket de destino dos uploads. |
| `R2_PUBLIC_URL` | Sim | URL base pública usada para montar o endereço final dos arquivos. |
| `R2_ENDPOINT` | — | Presente no `.env.example`, mas **atualmente não é lida pelo código** — o endpoint é derivado de `R2_ACCOUNT_ID`. |

A validação e os valores padrão estão centralizados em [back-end/src/config/env.ts](back-end/src/config/env.ts). As variáveis marcadas como obrigatórias interrompem a inicialização da aplicação se estiverem ausentes.

### Frontend — `front-end/.env`

```env
VITE_API_URL=
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_API_URL` | Não | URL base da API. Se não for informada, o código usa o fallback `http://localhost:3001`. |

> Nenhum valor real de credencial deve ser versionado. Os arquivos `.env` estão listados no `.gitignore`; apenas os `.env.example` são rastreados.

---

## Scripts disponíveis

### Raiz (orquestrados pelo Turborepo)

| Script | Descrição |
|---|---|
| `pnpm dev` | Executa `dev` e `start:dev` em todos os workspaces (API em watch + Vite). |
| `pnpm build` | Builda todos os workspaces respeitando a ordem de dependências. |
| `pnpm lint` | Executa o lint nos workspaces que possuem o script. |
| `pnpm format` | Executa a formatação nos workspaces que possuem o script. |
| `pnpm test` | Executa os testes unitários dos workspaces. |
| `pnpm test:e2e` | Executa os testes end-to-end. |
| `pnpm start:dev` | Sobe apenas o backend em modo watch. |
| `pnpm start:front` | Sobe apenas o frontend. |
| `pnpm build:back` / `pnpm build:front` | Builda apenas um dos workspaces. |
| `pnpm prisma:generate` | Gera o Prisma Client. |
| `pnpm prisma:migrate:dev` | Cria e aplica migrations em desenvolvimento. |
| `pnpm prisma:migrate:deploy` | Aplica as migrations pendentes (produção). |

### `back-end/`

| Script | Descrição |
|---|---|
| `build` | Compila a API com `nest build`. |
| `start` / `start:dev` / `start:debug` | Sobe a API em modo normal, watch ou debug. |
| `start:prod` | Executa o build compilado (`node dist/src/main.js`). |
| `lint` | Executa o ESLint com `--fix`. |
| `format` | Formata `src/` e `test/` com Prettier. |
| `test` / `test:watch` / `test:cov` / `test:debug` | Testes unitários com Jest, em suas variações. |
| `test:e2e` | Testes end-to-end via `test/jest-e2e.json`. |
| `prisma:generate` / `prisma:migrate:dev` / `prisma:migrate:deploy` / `prisma:studio` | Comandos do Prisma. |

### `front-end/`

| Script | Descrição |
|---|---|
| `dev` | Servidor de desenvolvimento do Vite (porta 5173, `strictPort`). |
| `build` | Type-check com `tsc -b` seguido do build do Vite. |
| `preview` | Serve localmente o build gerado. |
| `start` | Serve o diretório `dist` com `serve` na porta definida por `$PORT`. |

### `shared/`

| Script | Descrição |
|---|---|
| `build` | Compila os contratos com `tsc` para `shared/dist/`. |
| `prepare` | Executa o build automaticamente após `pnpm install`. |

---

## Status do projeto

**Funcional e em evolução.** O núcleo da aplicação está implementado ponta a ponta: é possível autenticar, gerenciar usuários, navegar pela hierarquia de pastas, enviar e baixar arquivos com armazenamento em nuvem, e operar o catálogo de exames e as solicitações.

**O que está consolidado**
- Separação de camadas consistente no backend, com 5 controllers, 26 use cases e 5 repositories seguindo o mesmo padrão.
- RBAC aplicado por rota e reforçado por regras de propriedade dentro dos use cases, com cobertura em teste e2e.
- Soft delete uniforme em todas as entidades, sem nenhuma exclusão física no backend.
- Paginação, filtro e contagem executados no banco, com contrato de resposta padronizado.
- Contratos de API compartilhados entre backend e frontend por um pacote único, evitando divergência de tipos.

**O que está parcial ou pendente**
- **Cobertura de testes limitada**: 9 specs unitários (concentrados nos use cases de listagem e no domínio de solicitações) e 2 suítes e2e. Vários use cases de escrita ainda não têm teste.
- **Sem testes no frontend** — não há runner configurado.
- **Sem lint/format no frontend** — ESLint e Prettier existem apenas no backend, e o `front-end/` não expõe scripts `lint`/`test`, de modo que `pnpm lint` e `pnpm test` na raiz cobrem apenas a API.
- **Sem documentação de API** (Swagger/OpenAPI não está instalado) — o contrato precisa ser lido nos controllers e DTOs.
- **Sem CI/CD, sem Docker e sem deploy publicado.** O único artefato relacionado a deploy é um `railpack.json` no backend.
- Camada de estilos mista no frontend: classes utilitárias do Tailwind, um design system em CSS puro e blocos de estilo injetados em tempo de execução em algumas páginas convivem no mesmo projeto.
- `DashboardPage.tsx` existe mas não está registrada no roteador.
- Ausência de arquivo de licença.

**Inconsistências conhecidas**
- A porta padrão da API no código é `3000`, enquanto o fallback do frontend aponta para `http://localhost:3001` — em desenvolvimento é necessário definir `PORT` ou `VITE_API_URL` de forma coerente.
- `R2_ENDPOINT` aparece no `.env.example` mas não é consumida pelo código.
- O soft delete de arquivos não remove o objeto correspondente do bucket R2.

---

## Aprendizados e pontos técnicos demonstrados

- **Desenvolvimento full stack em TypeScript**, com tipagem compartilhada atravessando a fronteira HTTP através de um pacote interno.
- **API REST com NestJS 11** aplicando injeção de dependência, módulos, interceptors e uma arquitetura em camadas explícita (`controller → DTO → use case → repository`).
- **Autenticação JWT** com Passport e hash de senhas com bcrypt.
- **Controle de acesso por papéis** implementado em duas frentes complementares: guard declarativo por rota e verificação de propriedade dentro das regras de negócio.
- **Modelagem relacional com Prisma**, incluindo auto-relacionamento para hierarquia de pastas, relação N–N e um histórico de 10 migrations que evidencia evolução incremental do schema.
- **Uso de driver adapter do Prisma** (`@prisma/adapter-pg`) com controle explícito de pool e schema.
- **Paginação, busca e contagem no banco de dados**, evitando filtragem em memória, com contrato de resposta padronizado `{ data, meta }`.
- **Integração com armazenamento de objetos** via SDK compatível com S3, incluindo geração de chave, preservação de mimetype, upload em lote com tolerância a falhas parciais e download por streaming com timeout.
- **Soft delete consistente** aplicado como política do domínio inteiro.
- **Validação de dados de entrada** com DTOs, `class-validator` e normalização de campos.
- **Organização em monorepo** com pnpm workspaces e Turborepo, incluindo ordenação de builds por dependência entre pacotes.
- **Frontend organizado por features**, com separação entre página, hook e service, rotas protegidas por autenticação e por papel, e assistentes em múltiplas etapas.
- **Testes automatizados** com Jest e Supertest, incluindo uma suíte dedicada a validar o comportamento do RBAC por código de status HTTP.

---

## Melhorias futuras

- Ampliar a cobertura de testes unitários para os use cases de escrita (criação, atualização, upload e soft delete).
- Introduzir um runner de testes no frontend e cobrir hooks e utilitários.
- Adicionar ESLint e Prettier ao `front-end/`, junto dos scripts `lint`, `format` e `test`, para que os comandos da raiz cubram todo o monorepo.
- Documentar a API com Swagger/OpenAPI a partir dos DTOs já existentes.
- Configurar pipeline de CI (lint, build e testes a cada pull request) e, na sequência, CD.
- Criar ambiente containerizado com Docker Compose (API + PostgreSQL) para simplificar o onboarding.
- Substituir o acesso público aos arquivos por **URLs pré-assinadas**, restringindo a leitura direta do bucket.
- Definir limite de tamanho por upload e validação de tipos de arquivo aceitos.
- Remover o objeto no R2 (ou movê-lo para uma área de retenção) quando o arquivo for excluído logicamente.
- Adotar um `ValidationPipe` global e um filtro global de exceções, reduzindo repetição nos controllers e padronizando o corpo das respostas de erro.
- Implementar refresh token e tratamento automático de `401` no interceptor do Axios.
- Restringir a origem do CORS por ambiente, hoje configurada para refletir qualquer origem.
- Unificar a estratégia de estilos do frontend, eliminando os blocos de CSS injetados em tempo de execução.
- Alinhar a porta padrão da API entre backend e frontend, e remover a variável `R2_ENDPOINT` não utilizada.
- Adicionar script de seed para criar o primeiro usuário `ADMIN` e dados de demonstração.
- Adicionar arquivo de licença, capturas de tela da interface e um ambiente de demonstração publicado.

---

## Autor

Desenvolvido por **Rafael Medeiros**.

GitHub: [@RafaelMedeirosDev](https://github.com/RafaelMedeirosDev)
