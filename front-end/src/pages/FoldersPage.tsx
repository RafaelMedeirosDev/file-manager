import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { FolderIcon } from '../components/Icons';

type FolderItem = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
};

type UserOption = {
  id: string;
  name: string;
  email: string;
};

function getApiErrorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join(', ');
  return fallback;
}

export function FoldersPage() {
  const { user } = useAuth();

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [usersOptions, setUsersOptions] = useState<UserOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [selectedCreateUserId, setSelectedCreateUserId] = useState('');
  const [filterUserId, setFilterUserId] = useState('');

  const usersById = useMemo(
    () => new Map(usersOptions.map((option) => [option.id, option.name])),
    [usersOptions],
  );

  const visibleFolders = useMemo(() => {
    if (!filterUserId) return folders;
    return folders.filter((folder) => folder.userId === filterUserId);
  }, [folders, filterUserId]);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get<FolderItem[]>('/folders', {
        params: { rootsOnly: true },
      });
      setFolders(data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erro ao carregar pastas.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;

    async function fetchUsers() {
      try {
        const { data } = await api.get<UserOption[]>('/users');
        setUsersOptions(data);

        if (data.length > 0) {
          setSelectedCreateUserId((prev) => prev || data[0].id);
        }
      } catch (err: any) {
        setError(getApiErrorMessage(err, 'Erro ao carregar usuarios.'));
      }
    }

    void fetchUsers();
  }, [user?.role]);

  async function handleCreateFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    if (user.role === 'ADMIN' && !selectedCreateUserId) {
      setCreateError('Selecione um usuario para criar a pasta.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      await api.post('/folders', {
        name: newFolderName,
        userId: user.role === 'ADMIN' ? selectedCreateUserId : user.id,
      });

      setNewFolderName('');
      await fetchFolders();
    } catch (err: any) {
      setCreateError(getApiErrorMessage(err, 'Erro ao criar pasta.'));
    } finally {
      setCreating(false);
    }
  }

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
            onChange={(event) => setFilterUserId(event.target.value)}
          >
            <option value="">Filtrar por usuario</option>
            {usersOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setFilterUserId('')}
          >
            Limpar filtro
          </button>
        </div>
      ) : null}

      {user?.role === 'ADMIN' ? (
        <form className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleCreateFolder}>
          <select
            className="app-input"
            value={selectedCreateUserId}
            onChange={(event) => setSelectedCreateUserId(event.target.value)}
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
            onChange={(event) => setNewFolderName(event.target.value)}
            placeholder="Nova pasta raiz"
            className="app-input"
            required
          />

          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? 'Criando...' : 'Criar pasta'}
          </button>
        </form>
      ) : null}

      {createError ? <p className="mt-3 text-sm font-medium text-rose-600">{createError}</p> : null}
      {loading ? <p className="mt-3 text-sm text-slate-500">Carregando...</p> : null}
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

      {!loading && !error ? (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {visibleFolders.map((folder) => {
            const ownerName = usersById.get(folder.userId) ?? 'Usuario desconhecido';

            return (
              <li key={folder.id}>
                <Link
                  to={`/folders/${folder.id}`}
                  className="flex h-full min-h-[112px] flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <FolderIcon className="h-8 w-8 text-brand-600" />
                  <span className="line-clamp-2 text-sm font-semibold text-slate-800">{folder.name}</span>
                  {user?.role === 'ADMIN' ? (
                    <span className="line-clamp-1 text-[11px] text-slate-500">{ownerName}</span>
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
      ) : null}
    </div>
  );
}


