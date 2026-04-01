import { useAuth } from '../hooks/useAuth';
import { FileIcon } from '../components/Icons';
import { useFiles } from '../features/files/hooks/useFiles';

export function FilesPage() {
  const { user } = useAuth();
  const {
    visibleFiles,
    usersOptions,
    usersById,
    foldersById,
    createFolders,
    filterFolders,
    extensionOptions,
    loading,
    loadingMore,
    error,
    actionError,
    creatingFile,
    downloadingFileId,
    deletingFileId,
    filterUserId,
    setFilterUserId,
    filterFolderId,
    setFilterFolderId,
    filterFileName,
    setFilterFileName,
    filterExtension,
    setFilterExtension,
    selectedUserId,
    setSelectedUserId,
    selectedFolderId,
    setSelectedFolderId,
    newFileName,
    setNewFileName,
    newFileExtension,
    setNewFileExtension,
    newFileUrl,
    setNewFileUrl,
    handleCreateFile,
    handleDownload,
    handleSoftDeleteFile,
    sentinelRef,
  } = useFiles();

  return (
    <div>
      <h1 className="app-page-title">Arquivos</h1>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {user?.role === 'ADMIN' ? (
          <select
            className="app-input"
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
          >
            <option value="">Filtrar por usuario</option>
            {usersOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        ) : null}

        <select
          className="app-input"
          value={filterFolderId}
          onChange={(e) => setFilterFolderId(e.target.value)}
        >
          <option value="">Filtrar por pasta</option>
          {filterFolders.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <input
          className="app-input"
          value={filterFileName}
          onChange={(e) => setFilterFileName(e.target.value)}
          placeholder="Buscar por nome"
        />

        <select
          className="app-input"
          value={filterExtension}
          onChange={(e) => setFilterExtension(e.target.value)}
        >
          <option value="">Filtrar por extensao</option>
          {extensionOptions.map((ext) => (
            <option key={ext} value={ext}>
              {ext}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setFilterUserId('');
            setFilterFolderId('');
            setFilterFileName('');
            setFilterExtension('');
          }}
        >
          Limpar filtros
        </button>
      </div>

      {user?.role === 'ADMIN' ? (
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6"
          onSubmit={handleCreateFile}
        >
          <select
            className="app-input"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            required
          >
            <option value="">Selecione usuario</option>
            {usersOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({option.email})
              </option>
            ))}
          </select>

          <select
            className="app-input"
            value={selectedFolderId}
            onChange={(e) => setSelectedFolderId(e.target.value)}
            required
          >
            <option value="">Selecione pasta</option>
            {createFolders.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>

          <input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="Nome"
            className="app-input"
            required
          />
          <input
            value={newFileExtension}
            onChange={(e) => setNewFileExtension(e.target.value)}
            placeholder="Extensao"
            className="app-input"
            required
          />
          <input
            value={newFileUrl}
            onChange={(e) => setNewFileUrl(e.target.value)}
            placeholder="URL"
            className="app-input"
            required
          />
          <button type="submit" className="btn-primary" disabled={creatingFile}>
            {creatingFile ? 'Criando...' : 'Criar arquivo'}
          </button>
        </form>
      ) : null}

      {actionError ? (
        <p className="mt-3 text-sm font-medium text-rose-600">{actionError}</p>
      ) : null}
      {loading ? <p className="mt-3 text-sm text-slate-500">Carregando...</p> : null}
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

      {!loading && !error ? (
        <>
          <ul className="mt-4 space-y-2">
            {visibleFiles.map((file) => {
              const ownerName  = usersById.get(file.userId)   ?? 'Usuário desconhecido';
              const folderName = file.folderId
                ? (foldersById.get(file.folderId) ?? 'Pasta desconhecida')
                : 'Sem pasta';

              return (
                <li key={file.id} className="app-list-item">
                  <span className="inline-flex flex-col gap-1 text-slate-700">
                    <span className="inline-flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-slate-500" />
                      <span>{file.name}.{file.extension}</span>
                    </span>
                    {user?.role === 'ADMIN' ? (
                      <span className="text-xs text-slate-500">
                        Usuario: {ownerName} | Pasta: {folderName}
                      </span>
                    ) : null}
                  </span>

                  <div className="flex items-center gap-2 sm:ml-auto">
                    {user?.role === 'ADMIN' ? (
                      <button
                        type="button"
                        className="btn-danger"
                        disabled={deletingFileId === file.id}
                        onClick={() => handleSoftDeleteFile(file.id, `${file.name}.${file.extension}`)}
                      >
                        {deletingFileId === file.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      className="download-btn"
                      disabled={downloadingFileId === file.id}
                      onClick={() => handleDownload(file.id, file.name, file.extension)}
                    >
                      {downloadingFileId === file.id ? 'Baixando...' : 'Download'}
                    </button>
                  </div>
                </li>
              );
            })}

            {visibleFiles.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                Nenhum arquivo encontrado.
              </li>
            ) : null}
          </ul>

          <div ref={sentinelRef} className="h-10" />
          {loadingMore ? (
            <p className="mt-2 text-center text-sm text-slate-500">
              Carregando mais arquivos...
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
