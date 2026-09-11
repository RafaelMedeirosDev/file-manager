-- Segundo passo de expand do multi-tenancy: `folders` e `files` passam a
-- pertencer a uma organizacao.
--
-- `exams` e `exam_requests` ficam para a migration seguinte, junto do codigo
-- que as consome. Dividir mantem o DEFAULT temporario abaixo vivo pelo menor
-- tempo possivel em cada tabela, e evita um repositorio meio escopado.
--
-- `users` nao recebe coluna: a identidade e global -- e o e-mail unique global
-- e o que permite a mesma pessoa pertencer a duas organizacoes. O recorte de
-- usuario e feito pela relacao `memberships`.
--
-- Sobre o DEFAULT: o deploy no Railway nao roda migration, entao os dois
-- eventos sao separados e esta migration e sempre aplicada ANTES do deploy de
-- codigo. No intervalo, o codigo ANTIGO roda contra o schema novo e insere sem
-- organization_id -- sem o default, todo INSERT dele falharia. As linhas caem
-- na organizacao principal, que e semanticamente correto: o codigo antigo so
-- servia a ela.
--
-- O default NAO e declarado em schema.prisma de proposito. Como
-- `@default(dbgenerated(...))`, o Prisma geraria `organizationId` como
-- OPCIONAL no FolderCreateInput, e o tsc deixaria de acusar um `create()` que
-- o esquecesse -- exatamente a rede de seguranca que sustenta este refactor.
-- O preco e que `prisma migrate dev` vai querer dropar o default, que e o que
-- a migration de contract faz de proposito.

-- ── folders ──────────────────────────────────────────────────────────────────
ALTER TABLE "folders" ADD COLUMN "organization_id" UUID;

UPDATE "folders" SET "organization_id" = '00000000-0000-4000-8000-000000000001';

ALTER TABLE "folders" ALTER COLUMN "organization_id" SET NOT NULL;

-- TEMPORARIO. Removido na migration de contract.
ALTER TABLE "folders" ALTER COLUMN "organization_id" SET DEFAULT '00000000-0000-4000-8000-000000000001';

ALTER TABLE "folders" ADD CONSTRAINT "folders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "folders_organization_id_idx" ON "folders"("organization_id");

-- ── files ────────────────────────────────────────────────────────────────────
ALTER TABLE "files" ADD COLUMN "organization_id" UUID;

UPDATE "files" SET "organization_id" = '00000000-0000-4000-8000-000000000001';

ALTER TABLE "files" ALTER COLUMN "organization_id" SET NOT NULL;

-- TEMPORARIO. Removido na migration de contract.
ALTER TABLE "files" ALTER COLUMN "organization_id" SET DEFAULT '00000000-0000-4000-8000-000000000001';

ALTER TABLE "files" ADD CONSTRAINT "files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "files_organization_id_idx" ON "files"("organization_id");
