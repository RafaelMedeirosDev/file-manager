import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type ListFoldersResponse = {
  data: FolderItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
};

type UserOption = {
  id: string;
  name: string;
  email: string;
};

type ListUsersResponse = {
  data: UserOption[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
};

type PaginatedResult<T> = {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
  isLegacyArray: boolean;
};

function getApiErrorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join(', ');
  return fallback;
}

function normalizePaginatedResponse<T>(
  payload: unknown,
  fallbackPage: number,
  fallbackLimit: number,
): PaginatedResult<T> {
  if (Array.isArray(payload)) {
    return {
      items: payload as T[],
      meta: {
        page: 1,
        limit: payload.length,
        total: payload.length,
        hasNextPage: false,
      },
      isLegacyArray: true,
    };
  }

  const response = payload as {
    data?: T[];
    meta?: {
      page?: number;
      limit?: number;
      total?: number;
      hasNextPage?: boolean;
    };
  };

  const items = Array.isArray(response.data) ? response.data : [];
  const meta = response.meta ?? {};

  return {
    items,
    meta: {
      page: meta.page ?? fallbackPage,
      limit: meta.limit ?? fallbackLimit,
      total: meta.total ?? items.length,
      hasNextPage: meta.hasNextPage ?? false,
    },
    isLegacyArray: false,
  };
}

export function FoldersPage() {
  const { user } = useAuth();

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [usersOptions, setUsersOptions] = useState<UserOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [selectedDeleteFolderId, setSelectedDeleteFolderId] = useState('');

  const [selectedCreateUserId, setSelectedCreateUserId] = useState('');
  const [filterUserId, setFilterUserId] = useState('');

  const [reloadKey, setReloadKey] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const usersById = useMemo(
    () => new Map(usersOptions.map((option) => [option.id, option.name])),
    [usersOptions],
  );

  const visibleFolders = useMemo(() => {
    if (!filterUserId) return folders;
    return folders.filter((folder) => folder.userId === filterUserId);
  }, [folders, filterUserId]);

  const folderById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  useEffect(() => {
    if (!selectedDeleteFolderId) return;

    const exists = visibleFolders.some((folder) => folder.id === selectedDeleteFolderId);
    if (!exists) {
      setSelectedDeleteFolderId('');
    }
  }, [selectedDeleteFolderId, visibleFolders]);

  const loadFoldersPage = useCallback(async (page: number, append: boolean) => {
    const { data } = await api.get<ListFoldersResponse | FolderItem[]>('/folders', {
      params: {
        rootsOnly: true,
        page,
        limit: 10,
      },
    });

    const parsed = normalizePaginatedResponse<FolderItem>(data, page, 10);

    setFolders((prev) => {
      if (!append) {
        return parsed.items;
      }

      const existingIds = new Set(prev.map((folder) => folder.id));
      const merged = [...prev];

      for (const item of parsed.items) {
        if (!existingIds.has(item.id)) {
          merged.push(item);
        }
      }

      return merged;
    });

    setCurrentPage(parsed.meta.page);
    setHasNextPage(parsed.isLegacyArray ? false : parsed.meta.hasNextPage);
  }, []);

  useEffect(() => {
    async function fetchFirstPage() {
      setLoading(true);
      setError(null);

      try {
        await loadFoldersPage(1, false);
      } catch (err: any) {
        setError(getApiErrorMessage(err, 'Erro ao carregar pastas.'));
      } finally {
        setLoading(false);
      }
    }

    void fetchFirstPage();
  }, [reloadKey, loadFoldersPage]);

  useEffect(() => {
    if (!sentinelRef.current || loading || loadingMore || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }

        setLoadingMore(true);
        void loadFoldersPage(currentPage + 1, true)
          .catch((err: any) => {
            setError(getApiErrorMessage(err, 'Erro ao carregar mais pastas.'));
          })
          .finally(() => {
            setLoadingMore(false);
          });
      },
      { rootMargin: '180px' },
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [currentPage, hasNextPage, loading, loadingMore, loadFoldersPage]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;

    async function fetchAllUsersOptions() {
      const pageLimit = 100;
      let page = 1;
      let hasMore = true;
      const allUsers: UserOption[] = [];

      while (hasMore) {
        const { data } = await api.get<ListUsersResponse | UserOption[]>('/users', {
          params: {
            page,
            limit: pageLimit,
          },
        });

        const parsed = normalizePaginatedResponse<UserOption>(
          data,
          page,
          pageLimit,
        );

        allUsers.push(...parsed.items);
        hasMore = parsed.isLegacyArray ? false : parsed.meta.hasNextPage;
        page += 1;
      }

      return allUsers;
    }

    async function fetchUsers() {
      try {
        const users = await fetchAllUsersOptions();
        setUsersOptions(users);

        if (users.length > 0) {
          setSelectedCreateUserId((prev) => prev || users[0].id);
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
      setReloadKey((prev) => prev + 1);
    } catch (err: any) {
      setCreateError(getApiErrorMessage(err, 'Erro ao criar pasta.'));
    } finally {
      setCreating(false);
    }
  }

  async function handleSoftDeleteFolder(folderId: string, folderName: string) {
    const confirmed = window.confirm(
      `Deseja realmente excluir a pasta \"${folderName}\"?`,
    );

    if (!confirmed) {
      return;
    }

    setCreateError(null);
    setDeletingFolderId(folderId);

    try {
      await api.delete(`/folders/${folderId}`);
      setSelectedDeleteFolderId('');
      setReloadKey((prev) => prev + 1);
    } catch (err: any) {
      setCreateError(getApiErrorMessage(err, 'Erro ao excluir pasta.'));
    } finally {
      setDeletingFolderId(null);
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
        <form
          className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={handleCreateFolder}
        >
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

      {user?.role === 'ADMIN' ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
          <select
            className="app-input"
            value={selectedDeleteFolderId}
            onChange={(event) => setSelectedDeleteFolderId(event.target.value)}
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
            className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              if (!selectedDeleteFolderId) {
                setCreateError('Selecione uma pasta para excluir.');
                return;
              }

              const folder = folderById.get(selectedDeleteFolderId);
              if (!folder) {
                setCreateError('Pasta selecionada nao encontrada.');
                return;
              }

              void handleSoftDeleteFolder(folder.id, folder.name);
            }}
            disabled={deletingFolderId !== null}
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
              const ownerName = usersById.get(folder.userId) ?? 'Usuario desconhecido';

              return (
                <li key={folder.id}>
                  <Link
                    to={`/folders/${folder.id}`}
                    className="flex h-full min-h-[112px] flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    <FolderIcon className="h-8 w-8 text-brand-600" />
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
            <p className="mt-2 text-center text-sm text-slate-500">Carregando mais pastas...</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
