// Ids das organizacoes criadas pela migration
// 20260910120000_add_organizations_and_memberships.
//
// Sao literais fixos, e nao valores gerados, porque tres coisas precisam
// referenciar a mesma organizacao sem consultar o banco antes: o backfill da
// propria migration, o seed que reconstroi a demo, e o runbook de verificacao
// em producao.
//
// Nada em `src/` importa este arquivo. O escopo de organizacao em tempo de
// execucao vem sempre do token (`req.user.organizationId`), nunca de uma
// constante -- se algum use case ou repositorio precisar de um destes ids, e
// sinal de que o escopo deixou de ser derivado da requisicao.
export const PRINCIPAL_ORGANIZATION_ID =
  '00000000-0000-4000-8000-000000000001';

export const DEMO_ORGANIZATION_ID = '00000000-0000-4000-8000-000000000002';
