-- Chave do objeto no R2, que passa a ser a fonte da verdade para ler o binario.
-- O download deixa de fazer fetch numa URL publica e passa a usar
-- GetObjectCommand com esta chave, o que permite fechar o bucket.
--
-- O backfill deriva a chave do fim da URL ja gravada, que sempre teve o formato
-- `${R2_PUBLIC_URL}/<uuid>.<ext>` -- os registros existentes sao recuperados sem
-- perda e sem depender do bucket.
--
-- O COALESCE cobre as linhas com url vazia deixadas pela migration
-- 20260319184500 (`UPDATE files SET url = '' WHERE url IS NULL`): sem ele o
-- substring devolveria NULL e o SET NOT NULL abaixo abortaria a migration.
-- Essas linhas apontam para objetos que nunca existiram, entao ficam com chave
-- vazia e o download responde 404 -- que e o comportamento correto para elas.

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "key" VARCHAR(255);

UPDATE "files" SET "key" = COALESCE(substring("url" from '[^/]+$'), '');

ALTER TABLE "files" ALTER COLUMN "key" SET NOT NULL;
