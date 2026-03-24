import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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

export function FolderDetailsPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [folder, setFolder] = useState<FolderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

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
  }, [id]);

  useEffect(() => {
    void fetchFolder();
  }, [fetchFolder]);

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

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link to="/folders" className="font-semibold text-brand-700 hover:text-brand-800">
              Desktop
            </Link>
            <span>/</span>
            {folder.parent ? (
              <>
                <Link to={`/folders/${folder.parent.id}`} className="font-semibold text-brand-700 hover:text-brand-800">
                  {folder.parent.name}
                </Link>
                <span>/</span>
              </>
            ) : null}
            <span className="font-semibold text-slate-700">{folder.name}</span>
          </div>

          {actionError ? <p className="mt-3 text-sm font-medium text-rose-600">{actionError}</p> : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
            <aside className="app-card bg-slate-50 p-3">
              <h2 className="app-section-title">Navegacao</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link to="/folders" className="inline-flex items-center gap-2 font-semibold text-brand-700">
                    <FolderIcon className="h-4 w-4 text-amber-500" />
                    <span>Desktop</span>
                  </Link>
                </li>
                {folder.parent ? (
                  <li>
                    <Link to={`/folders/${folder.parent.id}`} className="inline-flex items-center gap-2 text-slate-700 hover:text-brand-700">
                      <FolderIcon className="h-4 w-4 text-amber-500" />
                      <span>{folder.parent.name}</span>
                    </Link>
                  </li>
                ) : null}
                {folder.children.map((child) => (
                  <li key={`tree-${child.id}`}>
                    <Link to={`/folders/${child.id}`} className="inline-flex items-center gap-2 text-slate-700 hover:text-brand-700">
                      <FolderIcon className="h-4 w-4 text-amber-500" />
                      <span>{child.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>

            <section className="app-card p-3">
              <h2 className="text-lg font-semibold text-slate-900">Conteudo da pasta</h2>

              {user?.role === 'ADMIN' ? (
                <div className="mt-3 grid gap-3">
                  <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={handleCreateSubFolder}>
                    <input placeholder="Nova subpasta" value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} className="app-input" required />
                    <button type="submit" className="btn-primary" disabled={creatingFolder}>{creatingFolder ? 'Criando...' : 'Criar pasta'}</button>
                  </form>
                </div>
              ) : null}

              <h3 className="app-section-title mt-5">Subpastas</h3>
              <ul className="mt-2 space-y-2">
                {folder.children.map((child) => (
                  <li key={child.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <Link to={`/folders/${child.id}`} className="inline-flex items-center gap-2 font-semibold text-brand-700">
                      <FolderIcon className="h-4 w-4 text-amber-500" />
                      <span>{child.name}</span>
                    </Link>
                  </li>
                ))}
                {folder.children.length === 0 ? <li className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">Sem subpastas.</li> : null}
              </ul>

              <h3 className="app-section-title mt-5">Arquivos</h3>
              <ul className="mt-2 space-y-2">
                {folder.files.map((file) => (
                  <li key={file.id} className="app-list-item">
                    <span className="inline-flex items-center gap-2 text-slate-700">
                      <FileIcon className="h-4 w-4 text-slate-500" />
                      <span>{file.name}.{file.extension}</span>
                    </span>
                    <button
                      type="button"
                      className="download-btn sm:ml-auto"
                      disabled={downloadingFileId === file.id}
                      onClick={() => handleDownload(file.id, file.name, file.extension)}
                    >
                      {downloadingFileId === file.id ? 'Baixando...' : 'Download'}
                    </button>
                  </li>
                ))}
                {folder.files.length === 0 ? <li className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">Sem arquivos.</li> : null}
              </ul>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
