import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { FileIcon } from '../components/Icons';

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

type UserOption = {
  id: string;
  name: string;
  email: string;
};

type FolderOption = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
};

function getApiErrorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join(', ');
  return fallback;
}

export function FilesPage() {
  const { user } = useAuth();

  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [newFileName, setNewFileName] = useState('');
  const [newFileExtension, setNewFileExtension] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [creatingFile, setCreatingFile] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const [usersOptions, setUsersOptions] = useState<UserOption[]>([]);
  const [foldersOptions, setFoldersOptions] = useState<FolderOption[]>([]);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');

  const [filterUserId, setFilterUserId] = useState('');
  const [filterFolderId, setFilterFolderId] = useState('');
  const [filterFileName, setFilterFileName] = useState('');
  const [filterExtension, setFilterExtension] = useState('');

  const [reloadKey, setReloadKey] = useState(0);

  const createFolders = useMemo(() => {
    if (!selectedUserId) return [];
    return foldersOptions.filter((folder) => folder.userId === selectedUserId);
  }, [foldersOptions, selectedUserId]);

  const filterFolders = useMemo(() => {
    if (!filterUserId) return foldersOptions;
    return foldersOptions.filter((folder) => folder.userId === filterUserId);
  }, [foldersOptions, filterUserId]);

  const usersById = useMemo(() => new Map(usersOptions.map((option) => [option.id, option.name])), [usersOptions]);
  const foldersById = useMemo(() => new Map(foldersOptions.map((option) => [option.id, option.name])), [foldersOptions]);

  const extensionOptions = useMemo(() => {
    const values = files
      .map((file) => file.extension?.trim().toLowerCase())
      .filter((value) => Boolean(value)) as string[];

    return Array.from(new Set(values)).sort();
  }, [files]);

  const visibleFiles = useMemo(() => {
    const normalizedName = filterFileName.trim().toLowerCase();
    const normalizedExtension = filterExtension.trim().toLowerCase();

    return files.filter((file) => {
      if (filterUserId && file.userId !== filterUserId) return false;
      if (filterFolderId && file.folderId !== filterFolderId) return false;
      if (normalizedName && !file.name.toLowerCase().includes(normalizedName)) return false;
      if (normalizedExtension && file.extension.toLowerCase() !== normalizedExtension) return false;
      return true;
    });
  }, [files, filterUserId, filterFolderId, filterFileName, filterExtension]);

  useEffect(() => {
    async function fetchFiles() {
      setLoading(true);
      setError(null);

      try {
        const { data } = await api.get<FileItem[]>('/files');
        setFiles(data);
      } catch (err: any) {
        setError(getApiErrorMessage(err, 'Erro ao carregar arquivos.'));
      } finally {
        setLoading(false);
      }
    }

    void fetchFiles();
  }, [reloadKey]);

  useEffect(() => {
    async function fetchOptions() {
      try {
        if (user?.role === 'ADMIN') {
          const [usersResponse, foldersResponse] = await Promise.all([
            api.get<UserOption[]>('/users'),
            api.get<FolderOption[]>('/folders'),
          ]);

          setUsersOptions(usersResponse.data);
          setFoldersOptions(foldersResponse.data);

          if (usersResponse.data.length > 0) {
            const firstUserId = usersResponse.data[0].id;
            setSelectedUserId(firstUserId);
          }

          return;
        }

        const foldersResponse = await api.get<FolderOption[]>('/folders');
        setFoldersOptions(foldersResponse.data);
      } catch (err: any) {
        setActionError(getApiErrorMessage(err, 'Nao foi possivel carregar usuarios e pastas.'));
      }
    }

    void fetchOptions();
  }, [user?.role]);

  useEffect(() => {
    setSelectedFolderId('');
  }, [selectedUserId]);

  useEffect(() => {
    setFilterFolderId('');
  }, [filterUserId]);

  async function handleDownload(fileId: string, fileName: string, extension: string) {
    setActionError(null);
    setDownloadingFileId(fileId);

    try {
      const response = await api.get(`/files/${fileId}/download`, {
        responseType: 'blob',
      });

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

  async function handleCreateFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || user.role !== 'ADMIN') return;

    if (!selectedUserId) {
      setActionError('Selecione um usuario para criar o arquivo.');
      return;
    }

    if (!selectedFolderId) {
      setActionError('Selecione uma pasta para criar o arquivo.');
      return;
    }

    setActionError(null);
    setCreatingFile(true);

    try {
      await api.post('/files', {
        name: newFileName,
        userId: selectedUserId,
        folderId: selectedFolderId,
        extension: newFileExtension,
        url: newFileUrl,
      });

      setNewFileName('');
      setNewFileExtension('');
      setNewFileUrl('');
      setReloadKey((prev) => prev + 1);
    } catch (err: any) {
      setActionError(getApiErrorMessage(err, 'Nao foi possivel criar o arquivo.'));
    } finally {
      setCreatingFile(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Arquivos</h1>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {user?.role === 'ADMIN' ? (
          <select className="app-input" value={filterUserId} onChange={(event) => setFilterUserId(event.target.value)}>
            <option value="">Filtrar por usuario</option>
            {usersOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        ) : null}

        <select className="app-input" value={filterFolderId} onChange={(event) => setFilterFolderId(event.target.value)}>
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
          onChange={(event) => setFilterFileName(event.target.value)}
          placeholder="Buscar por nome"
        />

        <select className="app-input" value={filterExtension} onChange={(event) => setFilterExtension(event.target.value)}>
          <option value="">Filtrar por extensao</option>
          {extensionOptions.map((extension) => (
            <option key={extension} value={extension}>
              {extension}
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
        <form className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6" onSubmit={handleCreateFile}>
          <select className="app-input" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} required>
            <option value="">Selecione usuario</option>
            {usersOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({option.email})
              </option>
            ))}
          </select>

          <select className="app-input" value={selectedFolderId} onChange={(event) => setSelectedFolderId(event.target.value)} required>
            <option value="">Selecione pasta</option>
            {createFolders.map((folderOption) => (
              <option key={folderOption.id} value={folderOption.id}>
                {folderOption.name}
              </option>
            ))}
          </select>

          <input value={newFileName} onChange={(event) => setNewFileName(event.target.value)} placeholder="Nome" className="app-input" required />
          <input value={newFileExtension} onChange={(event) => setNewFileExtension(event.target.value)} placeholder="Extensao" className="app-input" required />
          <input value={newFileUrl} onChange={(event) => setNewFileUrl(event.target.value)} placeholder="URL" className="app-input" required />
          <button type="submit" className="btn-primary" disabled={creatingFile}>{creatingFile ? 'Criando...' : 'Criar arquivo'}</button>
        </form>
      ) : null}

      {actionError ? <p className="mt-3 text-sm font-medium text-rose-600">{actionError}</p> : null}
      {loading ? <p className="mt-3 text-sm text-slate-500">Carregando...</p> : null}
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

      {!loading && !error ? (
        <ul className="mt-4 space-y-2">
          {visibleFiles.map((file) => {
            const fileOwnerName = usersById.get(file.userId) ?? 'Usuario desconhecido';
            const fileFolderName = file.folderId ? foldersById.get(file.folderId) ?? 'Pasta desconhecida' : 'Sem pasta';

            return (
              <li key={file.id} className="app-list-item">
                <span className="inline-flex flex-col gap-1 text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <FileIcon className="h-4 w-4 text-slate-500" />
                    <span>{file.name}.{file.extension}</span>
                  </span>
                  {user?.role === 'ADMIN' ? (
                    <span className="text-xs text-slate-500">
                      Usuario: {fileOwnerName} | Pasta: {fileFolderName}
                    </span>
                  ) : null}
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
            );
          })}
          {visibleFiles.length === 0 ? <li className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">Nenhum arquivo encontrado.</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
