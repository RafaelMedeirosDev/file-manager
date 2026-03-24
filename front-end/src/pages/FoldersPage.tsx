import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

type FolderItem = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function FoldersPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const folderId = searchParams.get('folderId');
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const title = useMemo(() => {
    if (folderId) {
      return 'Subpastas';
    }

    return 'Pastas Raiz';
  }, [folderId]);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get<FolderItem[]>('/folders', {
        params: folderId ? { folderId } : { rootsOnly: true },
      });
      setFolders(data);
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message;
      setError(typeof apiMessage === 'string' ? apiMessage : 'Erro ao carregar pastas.');
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    void fetchFolders();
  }, [fetchFolders]);

  async function handleCreateFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      await api.post('/folders', {
        name: newFolderName,
        userId: user.id,
        folderId: folderId ?? undefined,
      });
      setNewFolderName('');
      await fetchFolders();
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message;
      setCreateError(typeof apiMessage === 'string' ? apiMessage : 'Erro ao criar pasta.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1>{title}</h1>
      <div className="actions-row">
        <button type="button" onClick={() => setSearchParams({})}>
          Ver raiz
        </button>
      </div>

      {user?.role === 'ADMIN' ? (
        <form className="inline-form" onSubmit={handleCreateFolder}>
          <input
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            placeholder={folderId ? 'Nova subpasta' : 'Nova pasta raiz'}
            required
          />
          <button type="submit" disabled={creating}>
            {creating ? 'Criando...' : 'Criar pasta'}
          </button>
        </form>
      ) : null}

      {createError ? <p className="error-message">{createError}</p> : null}

      {loading ? <p>Carregando...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {!loading && !error ? (
        <ul className="item-list">
          {folders.map((folder) => (
            <li key={folder.id}>
              <Link to={`/folders/${folder.id}`}>{folder.name}</Link>
            </li>
          ))}
          {folders.length === 0 ? <li>Nenhuma pasta encontrada.</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
