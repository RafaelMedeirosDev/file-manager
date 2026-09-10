-- Introduz multi-tenancy por organizacao. Este e o primeiro dos dois passos de
-- expand: cria a raiz (organizations) e a associacao (memberships), e vincula
-- todos os usuarios existentes a organizacao principal com o papel que ja
-- tinham em users.role.
--
-- Nada e consumido ainda: nenhuma coluna organization_id entra nas tabelas de
-- dados aqui, e nenhum codigo le estas tabelas depois desta migration. Logo a
-- aplicacao em producao segue funcionando identica, com ou sem o deploy.
--
-- Os dois ids sao literais fixos, e nao gen_random_uuid(): o backfill abaixo, o
-- seed da organizacao demo e o runbook de verificacao precisam referenciar a
-- mesma organizacao sem consultar o banco antes. O nibble de versao (4) e o de
-- variante (8) estao corretos, entao os valores passam por @IsUUID('4') se um
-- dia entrarem num DTO.
--
--   00000000-0000-4000-8000-000000000001  principal (dados reais)
--   00000000-0000-4000-8000-000000000002  demo (credencial publica)

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

INSERT INTO "organizations" ("id", "name", "slug") VALUES
  ('00000000-0000-4000-8000-000000000001', 'Organizacao Principal', 'principal'),
  ('00000000-0000-4000-8000-000000000002', 'Demonstracao', 'demo');

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "role" "ROLE" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_organization_id_key" ON "memberships"("user_id", "organization_id");

-- CreateIndex
CREATE INDEX "memberships_organization_id_idx" ON "memberships"("organization_id");

-- Backfill: todo usuario existente pertence a organizacao principal, com o
-- papel que ja tinha. Sem filtro de deleted_at de proposito -- um usuario
-- soft-deletado precisa manter a associacao, senao reativa-lo perderia o
-- vinculo e o conflito de e-mail passaria a mentir sobre o motivo.
--
-- gen_random_uuid() e nucleo do PostgreSQL desde a 13, nao exige extensao.
INSERT INTO "memberships" ("id", "user_id", "organization_id", "role")
SELECT gen_random_uuid(), "id", '00000000-0000-4000-8000-000000000001', "role"
FROM "users";

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
