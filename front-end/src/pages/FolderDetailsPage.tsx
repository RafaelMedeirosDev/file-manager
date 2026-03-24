import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { FileIcon, FolderIcon } from '../components/Icons';

type FolderChild = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
};

type FileItem = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  extension: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

type FolderDetails = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  parent: FolderChild | null;
  children: FolderChild[];
  files: FileItem[];
  createdAt: string;
  updatedAt: string;
};

function getApiErrorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join(', ');
  return fallback;
}

type ExplorerEntry =
  | { type: 'folder'; id: string; name: string }
  | { type: 'file'; id: string; name: string; extension: string };

export function FolderDetailsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [folder, setFolder] = useState<FolderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchFolder = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get<FolderDetails>(`/folders/${id}`);
      setFolder(data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erro ao carregar pasta.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setNewFolderName('');
    setActionError(null);
    setCreatingFolder(false);
    setDownloadingFileId(null);
    setSearchTerm('');
  }, [id]);

  useEffect(() => {
    void fetchFolder();
  }, [fetchFolder]);

  const entries = useMemo(() => {
    if (!folder) return [] as ExplorerEntry[];

    const normalizedSearch = searchTerm.trim().toLowerCase();

    const folders = folder.children
      .filter((child) =>
        normalizedSearch ? child.name.toLowerCase().includes(normalizedSearch) : true,
      )
      .map<ExplorerEntry>((child) => ({
        type: 'folder',
        id: child.id,
        name: child.name,
      }));

    const files = folder.files
      .filter((file) => {
        if (!normalizedSearch) return true;
        const fullName = `${file.name}.${file.extension}`.toLowerCase();
        return fullName.includes(normalizedSearch);
      })
      .map<ExplorerEntry>((file) => ({
        type: 'file',
        id: file.id,
        name: file.name,
        extension: file.extension,
      }));

    return [...folders, ...files];
  }, [folder, searchTerm]);

  async function handleDownload(fileId: string, fileName: string, extension: string) {
    setActionError(null);
    setDownloadingFileId(fileId);

    try {
      const response = await api.get(`/files/${fileId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${fileName}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setActionError(getApiErrorMessage(err, 'Nao foi possivel baixar o arquivo.'));
    } finally {
      setDownloadingFileId(null);
    }
  }

  async function handleCreateSubFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !id || !folder) return;

    setActionError(null);
    setCreatingFolder(true);

    try {
      const ownerId = user.role === 'ADMIN' ? folder.userId : user.id;

      await api.post('/folders', {
        name: newFolderName,
        userId: ownerId,
        folderId: id,
      });

      setNewFolderName('');
      await fetchFolder();
    } catch (err: any) {
      setActionError(getApiErrorMessage(err, 'Nao foi possivel criar a pasta.'));
    } finally {
      setCreatingFolder(false);
    }
  }

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
                      <FolderIcon className="h-4 w-4 text-amber-500" />
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



