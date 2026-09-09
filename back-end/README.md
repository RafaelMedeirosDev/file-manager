# Backend — File Manager

API REST em NestJS 11 com Prisma 7 e PostgreSQL. Este é o workspace `back-end/` do monorepo.

> Visão geral do projeto, arquitetura, modelagem de dados, RBAC e instruções completas de execução estão no [README da raiz](../README.md).

## Arquitetura

O fluxo de uma requisição segue `controller → DTO → use case → repository`:

| Camada | Pasta | Responsabilidade |
|---|---|---|
| Controllers | `src/controllers/` | Apenas transporte: validam o input via `ValidationPipe`, extraem o contexto de `req.user` e delegam para um use case. |
| DTOs | `src/shared/dto/<domínio>/` | Validam o formato do input com `class-validator` e normalizam strings. |
| Use cases | `src/usecases/<domínio>/` | Regras de negócio, checagem de propriedade e de soft delete, paginação e mapeamento de saída. |
| Repositories | `src/repositories/` | Única camada que fala com o Prisma. |

Módulos de apoio: `src/auth/` (JWT, guards, `@Roles`), `src/database/` (módulo global do Prisma), `src/config/env.ts` (validação das variáveis de ambiente no boot), `src/shared/` (interceptors, constantes, cliente R2).

## Pré-requisitos

- Node.js 20+ e pnpm 10+
- PostgreSQL acessível
- Bucket Cloudflare R2 com credenciais

## Configuração

```bash
cp .env.example .env    # preencha os valores
pnpm prisma:migrate:dev
pnpm prisma:seed        # cria o ADMIN e o USER iniciais
```

O Prisma Client é gerado pelo `postinstall` durante o `pnpm install`. Rode `pnpm prisma:generate` manualmente apenas após alterar o `schema.prisma`.

As variáveis obrigatórias são validadas em `src/config/env.ts` na inicialização: a aplicação falha imediatamente, com o nome da variável, se alguma estiver ausente. A referência completa está na [seção de variáveis de ambiente do README da raiz](../README.md#variáveis-de-ambiente).

## Scripts

| Script | Descrição |
|---|---|
| `pnpm start:dev` | Sobe a API em modo watch. |
| `pnpm start:debug` | Modo watch com o inspector do Node. |
| `pnpm build` | Compila com `nest build`. |
| `pnpm start:prod` | Executa o build compilado. |
| `pnpm test` | Testes unitários (Jest). |
| `pnpm test:watch` / `test:cov` | Watch e relatório de cobertura. |
| `pnpm test:e2e` | Testes end-to-end via `test/jest-e2e.json`. |
| `pnpm lint` | ESLint com `--fix`. |
| `pnpm lint:ci` | ESLint sem `--fix`, com `--max-warnings 0`. É o que o CI roda. |
| `pnpm format` | Prettier em `src/` e `test/`. |
| `pnpm prisma:migrate:dev` | Cria e aplica migrations em desenvolvimento. |
| `pnpm prisma:seed` | Popula o banco com um ADMIN, um USER e uma amostra do catálogo de exames. Sem ele não há como autenticar. |
| `pnpm prisma:migrate:deploy` | Aplica migrations pendentes (produção). |
| `pnpm prisma:generate` | Gera o Prisma Client. |
| `pnpm prisma:studio` | Abre o Prisma Studio. |

## Testes

- Specs unitários ficam ao lado dos use cases, em `src/usecases/**/*.spec.ts`.
- Testes end-to-end ficam em `test/`, incluindo `rbac.e2e-spec.ts`, que valida o controle de acesso por papel via códigos de status HTTP.
- Os repositórios são mockados no seam, então a suíte unitária não precisa de banco.

## Convenções

- Arquivos de controllers, use cases, repositories e DTOs usam `PascalCase.ts`.
- Providers e controllers são registrados em `src/app.module.ts`; a autenticação fica isolada em `src/auth/auth.module.ts`.
- Mensagens de erro vêm de `ErrorMessagesEnum`, exportado por `@file-manager/shared`.
- Todas as entidades usam soft delete via `deletedAt`; não há exclusão física.
- Filtro, ordenação e paginação são expressos como parâmetros de query do Prisma no repositório, nunca em memória no use case.

As regras detalhadas estão em [`.claude/rules/`](../.claude/rules/) na raiz do monorepo.
