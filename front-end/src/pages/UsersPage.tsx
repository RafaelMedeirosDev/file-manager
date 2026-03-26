import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
  updatedAt: string;
};

type ListUsersResponse = {
  data: UserItem[];
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

export function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [searchName, setSearchName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  const [reloadKey, setReloadKey] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadUsersPage = useCallback(
    async (page: number, append: boolean) => {
      const params: Record<string, string | number> = {
        page,
        limit: 10,
      };

      if (searchName.trim()) {
        params.name = searchName.trim();
      }

      if (searchEmail.trim()) {
        params.email = searchEmail.trim();
      }

      const { data } = await api.get<ListUsersResponse | UserItem[]>('/users', {
        params,
      });

      const parsed = normalizePaginatedResponse<UserItem>(data, page, 10);

      setUsers((prev) => {
        if (!append) {
          return parsed.items;
        }

        const existingIds = new Set(prev.map((user) => user.id));
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
    },
    [searchName, searchEmail],
  );

  useEffect(() => {
    async function fetchFirstPage() {
      setLoading(true);
      setError(null);

      try {
        await loadUsersPage(1, false);
      } catch (err: any) {
        setError(getApiErrorMessage(err, 'Erro ao carregar usuarios.'));
      } finally {
        setLoading(false);
      }
    }

    void fetchFirstPage();
  }, [reloadKey, loadUsersPage]);

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
        void loadUsersPage(currentPage + 1, true)
          .catch((err: any) => {
            setError(getApiErrorMessage(err, 'Erro ao carregar mais usuarios.'));
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
  }, [currentPage, hasNextPage, loading, loadingMore, loadUsersPage]);

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setActionError(null);
    setCreatingUser(true);

    try {
      await api.post('/users', {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
      });

      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setReloadKey((prev) => prev + 1);
    } catch (err: any) {
      setActionError(getApiErrorMessage(err, 'Erro ao criar usuario.'));
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleChangeOwnPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPasswordError(null);
    setPasswordSuccess(null);
    setChangingPassword(true);

    try {
      await api.patch('/users/me/password', {
        currentPassword,
        newPassword,
        confirmNewPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordSuccess('Senha atualizada com sucesso.');
    } catch (err: any) {
      setPasswordError(getApiErrorMessage(err, 'Erro ao atualizar senha.'));
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSoftDeleteUser(userId: string, userName: string) {
    const confirmed = window.confirm(
      `Deseja realmente excluir o usuario \"${userName}\"?`,
    );

    if (!confirmed) {
      return;
    }

    setActionError(null);
    setDeletingUserId(userId);

    try {
      await api.delete(`/users/${userId}`);
      setReloadKey((prev) => prev + 1);
    } catch (err: any) {
      setActionError(getApiErrorMessage(err, 'Erro ao excluir usuario.'));
    } finally {
      setDeletingUserId(null);
    }
  }

  return (
    <div>
      <h1 className="app-page-title">Usuarios</h1>
      <p className="app-page-subtitle">Painel administrativo de contas e perfis.</p>

      <form
        className="mt-4 grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={handleChangeOwnPassword}
      >
        <input
          className="app-input"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="Senha atual"
          minLength={6}
          maxLength={255}
          required
        />
        <input
          className="app-input"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Nova senha"
          minLength={6}
          maxLength={255}
          required
        />
        <input
          className="app-input"
          type="password"
          value={confirmNewPassword}
          onChange={(event) => setConfirmNewPassword(event.target.value)}
          placeholder="Confirmar nova senha"
          minLength={6}
          maxLength={255}
          required
        />
        <button type="submit" className="btn-primary" disabled={changingPassword}>
          {changingPassword ? 'Atualizando...' : 'Redefinir minha senha'}
        </button>
      </form>

      {passwordError ? (
        <p className="mt-3 text-sm font-medium text-rose-600">{passwordError}</p>
      ) : null}
      {passwordSuccess ? (
        <p className="mt-3 text-sm font-medium text-emerald-600">{passwordSuccess}</p>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input
          className="app-input"
          value={searchName}
          onChange={(event) => setSearchName(event.target.value)}
          placeholder="Buscar por nome"
        />
        <input
          className="app-input"
          type="email"
          value={searchEmail}
          onChange={(event) => setSearchEmail(event.target.value)}
          placeholder="Buscar por email"
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setSearchName('');
            setSearchEmail('');
          }}
        >
          Limpar filtros
        </button>
      </div>

      <form
        className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={handleCreateUser}
      >
        <input
          className="app-input"
          value={newUserName}
          onChange={(event) => setNewUserName(event.target.value)}
          placeholder="Nome"
          required
        />
        <input
          className="app-input"
          type="email"
          value={newUserEmail}
          onChange={(event) => setNewUserEmail(event.target.value)}
          placeholder="Email"
          required
        />
        <input
          className="app-input"
          type="password"
          value={newUserPassword}
          onChange={(event) => setNewUserPassword(event.target.value)}
          placeholder="Senha"
          required
        />
        <button type="submit" className="btn-primary" disabled={creatingUser}>
          {creatingUser ? 'Criando...' : 'Criar usuario'}
        </button>
      </form>

      {actionError ? (
        <p className="mt-3 text-sm font-medium text-rose-600">{actionError}</p>
      ) : null}
      {loading ? <p className="mt-3 text-sm text-slate-500">Carregando...</p> : null}
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

      {!loading && !error ? (
        <>
          <ul className="mt-4 space-y-2">
            {users.map((user) => (
              <li key={user.id} className="app-list-item">
                <span className="text-sm text-slate-700">
                  <span className="block font-semibold text-slate-900">{user.name}</span>
                  <span className="text-slate-500">{user.email}</span>
                </span>
                <div className="flex items-center gap-2">
                  <strong className="app-chip">{user.role}</strong>
                  <button
                    type="button"
                    className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => handleSoftDeleteUser(user.id, user.name)}
                    disabled={deletingUserId === user.id}
                  >
                    {deletingUserId === user.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </li>
            ))}
            {users.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                Nenhum usuario encontrado.
              </li>
            ) : null}
          </ul>

          <div ref={sentinelRef} className="h-10" />
          {loadingMore ? (
            <p className="mt-2 text-center text-sm text-slate-500">Carregando mais usuarios...</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
