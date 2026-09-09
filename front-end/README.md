# front-end

SPA em React 18 + Vite que consome a API deste monorepo. A visão geral do projeto,
a modelagem de dados e a matriz de permissões estão no
[README da raiz](../README.md).

## Arquitetura

O fluxo é `página → hook → service → API`, com responsabilidades estritas:

| Camada | Local | Responsabilidade |
|---|---|---|
| Página | `src/pages/` | Compõe a UI e chama hooks. Sem chamada HTTP direta. |
| Hook | `src/features/<feature>/hooks/` | Estado assíncrono, paginação, debounce e efeitos. |
| Service | `src/features/<feature>/services/` | Somente HTTP, devolvendo `response.data` tipado. |
| Componente | `src/features/<feature>/components/`, `src/shared/components/` | Renderiza a partir de props. |

Apoio: `src/app/` (router, guards e layout), `src/services/api.ts` (instância única
do Axios), `src/shared/` (tipos, utilitários e componentes reutilizáveis).

As features são `auth`, `users`, `folders`, `exams` e `exam-requests`.
`src/components/` e `src/types/` são áreas legadas ainda em uso — edite no lugar,
sem migrar, a não ser que a tarefa peça.

## Pré-requisitos

- Node.js 20+ e pnpm 10+
- A API rodando (por padrão em `http://localhost:3000`)

## Configuração

```bash
cp .env.example .env
```

`VITE_API_URL` é **obrigatória**: o app lança erro na inicialização se ela estiver
ausente, em vez de tentar uma origem errada em silêncio. Em desenvolvimento o valor
é `http://localhost:3000`, que casa com o `PORT` de `back-end/.env`.

Como as variáveis `VITE_*` são lidas na inicialização, reinicie o servidor do Vite
depois de alterar o `.env`.

## Scripts

| Script | Descrição |
|---|---|
| `dev` | Servidor de desenvolvimento na porta 5173 (`strictPort`). |
| `build` | `tsc -b` seguido do build do Vite. |
| `lint` | ESLint com `--fix`. |
| `lint:ci` | ESLint sem `--fix`, com `--max-warnings 0`. É o que o CI roda. |
| `format` | Prettier sobre `src/**/*.{ts,tsx}`. |
| `preview` | Serve localmente o build gerado. |
| `start` | Serve `dist/` com `serve` na porta de `$PORT`. |

## Testes

Não há runner de teste configurado neste workspace — a verificação automatizada se
limita a tipos (`tsc -b`) e lint. O ESLint trata `react-hooks/exhaustive-deps` como
**erro**, e não aviso: um dep array incompleto já causou um bug em que o upload por
arrastar ficava inativo para usuários `USER`.

## Convenções

- Reutilize os primitivos de `src/styles.css` (`app-card`, `app-input`, `btn-primary`)
  antes de criar classes novas.
- Reutilize `src/shared/utils/apiUtils.ts` para mensagem de erro e normalização de
  resposta paginada.
- Prefira os tipos de `@file-manager/shared` a redeclarar contratos localmente.

As regras completas estão em [`.claude/rules/frontend.md`](../.claude/rules/frontend.md).
