import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { FileIcon, FolderIcon } from '../components/Icons';
import { useFolderDetails } from '../features/folders/hooks/useFolderDetails';

export function FolderDetailsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    folder,
    entries,
    loading,
    error,
    actionError,
    creatingFolder,
    downloadingFileId,
    newFolderName,
    setNewFolderName,
    searchTerm,
    setSearchTerm,
    handleCreateSubFolder,
    handleDownload,
  } = useFolderDetails();

  return (
    <div>
      {loading ? <p className="text-sm text-slate-500">Carregando...</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      {folder && !loading ? (
        <>
          <h1 className="text-2xl font-bold text-slate-900">{folder.name}</h1>

          <div className="mt-4 app-card p-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="flex flex-1 flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
                <Link to="/folders" className="font-semibold text-brand-700 hover:text-brand-800">
                  Desktop
                </Link>
                <span>{'>'}</span>
                {folder.parent ? (
                  <>
                    <Link to={`/folders/${folder.parent.id}`} className="font-semibold text-brand-700 hover:text-brand-800">
                      {folder.parent.name}
                    </Link>
                    <span>{'>'}</span>
                  </>
                ) : null}
                <span className="font-semibold text-slate-800">{folder.name}</span>
              </div>

              <input
                className="app-input lg:max-w-xs"
                placeholder="Buscar nesta pasta"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          {actionError ? <p className="mt-3 text-sm font-medium text-rose-600">{actionError}</p> : null}

          {user?.role === 'ADMIN' ? (
            <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={handleCreateSubFolder}>
              <input
                placeholder="Nova subpasta"
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                className="app-input"
                required
              />
              <button type="submit" className="btn-primary" disabled={creatingFolder}>
                {creatingFolder ? 'Criando...' : 'Criar pasta'}
              </button>
            </form>
          ) : null}

          <section className="mt-4 app-card overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <span>Nome</span>
            </div>

            <ul>
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
                  {entry.type === 'folder' ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-left font-semibold text-brand-700 hover:text-brand-800"
                      onClick={() => navigate(`/folders/${entry.id}`)}
                    >
                      <FolderIcon className="h-4 w-4 text-brand-600" />
                      <span>{entry.name}</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-slate-700">
                      <FileIcon className="h-4 w-4 text-slate-500" />
                      <span>{entry.name}.{entry.extension}</span>
                    </span>
                  )}

                  {entry.type === 'folder' ? null : (
                    <button
                      type="button"
                      className="download-btn"
                      disabled={downloadingFileId === entry.id}
                      onClick={() => handleDownload(entry.id, entry.name, entry.extension)}
                    >
                      {downloadingFileId === entry.id ? 'Baixando...' : 'Download'}
                    </button>
                  )}
                </li>
              ))}

              {entries.length === 0 ? (
                <li className="px-4 py-5 text-sm text-slate-500">Nenhum item encontrado nesta pasta.</li>
              ) : null}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
