-- Terceiro e ultimo passo de expand do multi-tenancy: `exams` e
-- `exam_requests` passam a pertencer a uma organizacao. Depois desta migration
-- as quatro tabelas de dados estao escopadas.
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
-- OPCIONAL no ExamCreateInput, e o tsc deixaria de acusar um `create()` que o
-- esquecesse. A migration de contract remove os quatro defaults de uma vez.

-- ── exams ────────────────────────────────────────────────────────────────────
ALTER TABLE "exams" ADD COLUMN "organization_id" UUID;

UPDATE "exams" SET "organization_id" = '00000000-0000-4000-8000-000000000001';

ALTER TABLE "exams" ALTER COLUMN "organization_id" SET NOT NULL;

-- TEMPORARIO. Removido na migration de contract.
ALTER TABLE "exams" ALTER COLUMN "organization_id" SET DEFAULT '00000000-0000-4000-8000-000000000001';

ALTER TABLE "exams" ADD CONSTRAINT "exams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "exams_organization_id_idx" ON "exams"("organization_id");

-- A unique de `code` passa a ser por organizacao: as duas organizacoes
-- precisam poder carregar os mesmos codigos TUSS, e sem isso um ADMIN da
-- organizacao de demonstracao criando um exame colidiria com o catalogo real.
--
-- exams_code_key foi criada como INDICE unico em 20260402224410, nao como
-- constraint -- entao DROP INDEX e o comando certo.
--
-- A composta tambem nao tem recorte de deleted_at, mantendo o alinhamento com
-- ExamRepository.findByCode, que consulta linhas soft-deletadas de proposito
-- para que a guarda do use case e o banco nao divirjam.
DROP INDEX "exams_code_key";

CREATE UNIQUE INDEX "exams_organization_id_code_key" ON "exams"("organization_id", "code");

-- ── exam_requests ────────────────────────────────────────────────────────────
ALTER TABLE "exam_requests" ADD COLUMN "organization_id" UUID;

UPDATE "exam_requests" SET "organization_id" = '00000000-0000-4000-8000-000000000001';

ALTER TABLE "exam_requests" ALTER COLUMN "organization_id" SET NOT NULL;

-- TEMPORARIO. Removido na migration de contract.
ALTER TABLE "exam_requests" ALTER COLUMN "organization_id" SET DEFAULT '00000000-0000-4000-8000-000000000001';

ALTER TABLE "exam_requests" ADD CONSTRAINT "exam_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "exam_requests_organization_id_idx" ON "exam_requests"("organization_id");
