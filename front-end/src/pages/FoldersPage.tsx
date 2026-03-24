import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const folderId = searchParams.get('folderId');
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
    if (folderId) {
      return 'Subpastas';
    }

    return 'Pastas Raiz';
  }, [folderId]);

  useEffect(() => {
    async function fetchFolders() {
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
    }

    void fetchFolders();
  }, [folderId]);

  return (
    <div>
      <h1>{title}</h1>
      <div className="actions-row">
        <button type="button" onClick={() => setSearchParams({})}>
          Ver raiz
        </button>
      </div>

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
