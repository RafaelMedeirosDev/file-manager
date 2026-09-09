-- Indices para as 5 chaves estrangeiras do schema.
--
-- O PostgreSQL cria indice automatico para PRIMARY KEY e UNIQUE, mas nao para
-- FOREIGN KEY -- ao contrario do que se costuma supor. Ate aqui o schema nao
-- tinha nenhum indice deliberado, so os automaticos.
--
-- folders.folder_id e o mais justificado: `include: { children: true }` esta em
-- findById, findAll e listFoldersActive, e cada um vira `WHERE folder_id = $1`.
-- Os demais servem o escopo por dono das listagens (ROLE.USER) e o filtro por
-- pasta.
--
-- Sem CONCURRENTLY de proposito: CREATE INDEX pega ShareLock e bloqueia escrita
-- (nao leitura) enquanto constroi -- aqui, com dezenas de linhas, milissegundos.
-- CREATE INDEX CONCURRENTLY evitaria o lock, mas nao roda dentro de transacao, e
-- o Prisma Migrate aplica cada arquivo numa transacao: abortaria com 25001. Se a
-- tabela crescer, o caminho e psql fora de banda + `prisma migrate resolve`.

-- CreateIndex
CREATE INDEX "folders_user_id_idx" ON "folders"("user_id");

-- CreateIndex
CREATE INDEX "folders_folder_id_idx" ON "folders"("folder_id");

-- CreateIndex
CREATE INDEX "files_user_id_idx" ON "files"("user_id");

-- CreateIndex
CREATE INDEX "files_folder_id_idx" ON "files"("folder_id");

-- CreateIndex
CREATE INDEX "exam_requests_user_id_idx" ON "exam_requests"("user_id");
