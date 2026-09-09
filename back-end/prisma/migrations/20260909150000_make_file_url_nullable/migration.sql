-- Primeiro passo para remover a coluna `url`, legado do periodo em que o bucket
-- era publico. Desde a migration 20260908120000 quem resolve o binario e a
-- coluna `key`, lida por GetObjectCommand.
--
-- Tornar a coluna opcional antes de dropa-la mantem os dois lados compativeis
-- durante a transicao: a versao antiga da aplicacao continua podendo gravar a
-- url, e a nova pode deixar de gravar. Sem este passo intermediario haveria uma
-- janela entre migration e deploy em que um dos dois falharia.
--
-- O DROP COLUMN vem numa migration seguinte, depois de producao rodar sem
-- gravar a coluna.

-- AlterTable
ALTER TABLE "files" ALTER COLUMN "url" DROP NOT NULL;
