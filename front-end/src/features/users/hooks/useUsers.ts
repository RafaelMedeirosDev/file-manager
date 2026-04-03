import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiErrorMessage, normalizePaginatedResponse } from '../../../shared/utils/apiUtils';
import type { UserItem } from '../../../shared/types';
import { usersService } from '../services/usersService';

// ── Types internos do hook ───────────────────────────────

type UseUsersReturn = {
  // Dados
  users: UserItem[];
  totalUsers: number;

  // Estados de lista
  loading: boolean;
  loadingMore: boolean;
  error: string | null;

  // Estados de ação
  actionError: string | null;
  deletingUserId: string | null;

  // Formulário de senha
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmNewPassword: string;
  setConfirmNewPassword: (v: string) => void;
  changingPassword: boolean;
  passwordError: string | null;
  passwordSuccess: string | null;

  // Filtros de busca
  searchTerm: string;
  setSearchTerm: (v: string) => void;

  // Ações
  handleSoftDeleteUser: (userId: string, userName: string) => Promise<void>;
  handleChangeOwnPassword: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;

  // Ref para scroll infinito
  sentinelRef: React.RefObject<HTMLDivElement>;
};

// ── Hook ────────────────────────────────────────────────

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  // ── Carregamento de uma página ───────────────────────

  const loadUsersPage = useCallback(
    async (page: number, append: boolean) => {
      const params: Record<string, string | number> = { page, limit: 10 };
      const requestId = ++requestIdRef.current;

      if (debouncedSearchTerm) params.search = debouncedSearchTerm;

      try {
        const raw = await usersService.list(params);
        const parsed = normalizePaginatedResponse<UserItem>(raw, page, 10);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setUsers((prev) => {
          if (!append) return parsed.items;
          const existingIds = new Set(prev.map((user) => user.id));
          const merged = [...prev];

          for (const item of parsed.items) {
            if (!existingIds.has(item.id)) merged.push(item);
          }

          return merged;
        });

        setTotalUsers(parsed.meta.total);
        setCurrentPage(parsed.meta.page);
        setHasNextPage(parsed.isLegacyArray ? false : parsed.meta.hasNextPage);
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        throw err;
      }
    },
    [debouncedSearchTerm],
  );

  // ── Primeira carga ───────────────────────────────────

  useEffect(() => {
    async function fetchFirstPage() {
      setLoading(true);
      setLoadingMore(false);
      setError(null);
      setUsers([]);
      setTotalUsers(0);
      setCurrentPage(0);
      setHasNextPage(false);

      try {
        await loadUsersPage(1, false);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Erro ao carregar usuários.'));
      } finally {
        setLoading(false);
      }
    }
    void fetchFirstPage();
  }, [reloadKey, loadUsersPage]);

  // ── Scroll infinito ──────────────────────────────────

  useEffect(() => {
    if (!sentinelRef.current || loading || loadingMore || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setLoadingMore(true);
        void loadUsersPage(currentPage + 1, true)
          .catch((err) => setError(getApiErrorMessage(err, 'Erro ao carregar mais usuários.')))
          .finally(() => setLoadingMore(false));
      },
      { rootMargin: '180px' },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [currentPage, hasNextPage, loading, loadingMore, loadUsersPage]);

  // ── Ações ────────────────────────────────────────────

  async function handleChangeOwnPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    setChangingPassword(true);
    try {
      await usersService.changeOwnPassword({ currentPassword, newPassword, confirmNewPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordSuccess('Senha atualizada com sucesso.');
    } catch (err) {
      setPasswordError(getApiErrorMessage(err, 'Erro ao atualizar senha.'));
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSoftDeleteUser(userId: string, userName: string) {
    const confirmed = window.confirm(`Deseja realmente excluir o usuário "${userName}"?`);
    if (!confirmed) return;

    setActionError(null);
    setDeletingUserId(userId);
    try {
      await usersService.softDelete(userId);
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Erro ao excluir usuário.'));
    } finally {
      setDeletingUserId(null);
    }
  }

  // ── Retorno ──────────────────────────────────────────

  return {
    users,
    totalUsers,
    loading,
    loadingMore,
    error,
    actionError,
    deletingUserId,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    changingPassword,
    passwordError,
    passwordSuccess,
    searchTerm,
    setSearchTerm,
    handleSoftDeleteUser,
    handleChangeOwnPassword,
    sentinelRef,
  };
}
