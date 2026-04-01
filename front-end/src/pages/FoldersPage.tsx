import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FolderIcon } from '../components/Icons';
import { useFolders } from '../features/folders/hooks/useFolders';

export function FoldersPage() {
  const { user } = useAuth();
  const {
    visibleFolders,
    usersOptions,
    usersById,
    folderById,
    loading,
    loadingMore,
    error,
    createError,
    creating,
    deletingFolderId,
    filterUserId,
    setFilterUserId,
    selectedCreateUserId,
    setSelectedCreateUserId,
    selectedDeleteFolderId,
    setSelectedDeleteFolderId,
    newFolderName,
    setNewFolderName,
    handleCreateFolder,
    handleSoftDeleteFolder,
    sentinelRef,
  } = useFolders();

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="app-page-title">Pastas Raiz</h1>
      </div>

      {user?.role === 'ADMIN' ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
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

          <button type="button" className="btn-secondary" onClick={() => setFilterUserId('')}>
            Limpar filtro
          </button>
        </div>
      ) : null}

      {user?.role === 'ADMIN' ? (
        <form
          className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={handleCreateFolder}
        >
          <select
            className="app-input"
            value={selectedCreateUserId}
            onChange={(e) => setSelectedCreateUserId(e.target.value)}
            required
          >
            <option value="">Selecione usuario</option>
            {usersOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({option.email})
              </option>
            ))}
          </select>

          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nova pasta raiz"
            className="app-input"
            required
          />

          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? 'Criando...' : 'Criar pasta'}
          </button>
        </form>
      ) : null}

      {user?.role === 'ADMIN' ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
          <select
            className="app-input"
            value={selectedDeleteFolderId}
            onChange={(e) => setSelectedDeleteFolderId(e.target.value)}
          >
            <option value="">Selecione uma pasta para excluir</option>
            {visibleFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn-danger"
            disabled={deletingFolderId !== null}
            onClick={() => {
              if (!selectedDeleteFolderId) {
                return;
              }
              const folder = folderById.get(selectedDeleteFolderId);
              if (folder) {
                void handleSoftDeleteFolder(folder.id, folder.name);
              }
            }}
          >
            {deletingFolderId ? 'Excluindo...' : 'Excluir pasta'}
          </button>
        </div>
      ) : null}

      {createError ? (
        <p className="mt-3 text-sm font-medium text-rose-600">{createError}</p>
      ) : null}
      {loading ? <p className="mt-3 text-sm text-slate-500">Carregando...</p> : null}
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

      {!loading && !error ? (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {visibleFolders.map((folder) => {
              const ownerName = usersById.get(folder.userId) ?? 'Usuário desconhecido';

              return (
                <li key={folder.id}>
                  <Link
                    to={`/folders/${folder.id}`}
                    className="flex h-full min-h-[112px] flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center transition hover:border-brand-100 hover:bg-[#f5f9fd]"
                  >
                    <FolderIcon className="h-8 w-8 text-brand-500" />
                    <span className="line-clamp-2 text-sm font-semibold text-slate-800">
                      {folder.name}
                    </span>
                    {user?.role === 'ADMIN' ? (
                      <span className="line-clamp-1 text-[11px] text-slate-500">
                        {ownerName}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
            {visibleFolders.length === 0 ? (
              <li className="col-span-full rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                Nenhuma pasta encontrada.
              </li>
            ) : null}
          </ul>

          <div ref={sentinelRef} className="h-10" />
          {loadingMore ? (
            <p className="mt-2 text-center text-sm text-slate-500">
              Carregando mais pastas...
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
