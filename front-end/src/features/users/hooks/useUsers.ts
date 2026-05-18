import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiErrorMessage, normalizePaginatedResponse } from '../../../shared/utils/apiUtils';
import type { UserItem } from '../../../shared/types';
import { usersService } from '../services/usersService';

const PAGE_LIMIT = 10;

type UseUsersReturn = {
  users: UserItem[];
  totalUsers: number;
  loading: boolean;
  error: string | null;
  actionError: string | null;
  deletingUserId: string | null;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  page: number;
  totalPages: number;
  goToPage: (p: number) => void;
  handleSoftDeleteUser: (userId: string, userName: string) => Promise<void>;
};

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTermState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const requestIdRef = useRef(0);

  // Debounce da busca — reseta para página 1 ao buscar
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  function setSearchTerm(v: string) {
    setSearchTermState(v);
  }

  // ── Fetch ────────────────────────────────────────────

  const fetchPage = useCallback(async (targetPage: number) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const params: Record<string, string | number> = { page: targetPage, limit: PAGE_LIMIT };
    if (debouncedSearch) params.search = debouncedSearch;

    try {
      const raw = await usersService.list(params);
      const parsed = normalizePaginatedResponse<UserItem>(raw, targetPage, PAGE_LIMIT);

      if (requestId !== requestIdRef.current) return;

      setUsers(parsed.items);
      setTotalUsers(parsed.meta.total);
      setTotalPages(Math.max(1, Math.ceil(parsed.meta.total / PAGE_LIMIT)));
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(getApiErrorMessage(err, 'Erro ao carregar usuários.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void fetchPage(page);
  }, [page, reloadKey, fetchPage]);

  // ── Navegação ────────────────────────────────────────

  function goToPage(p: number) {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Ações ────────────────────────────────────────────

  async function handleSoftDeleteUser(userId: string, userName: string) {
    const confirmed = window.confirm(`Deseja realmente excluir o usuário "${userName}"?`);
    if (!confirmed) return;

    setActionError(null);
    setDeletingUserId(userId);
    try {
      await usersService.softDelete(userId);
      // Se excluiu o último da página, volta uma página
      const nextTotal = totalUsers - 1;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / PAGE_LIMIT));
      const targetPage = page > nextTotalPages ? nextTotalPages : page;
      setPage(targetPage);
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Erro ao excluir usuário.'));
    } finally {
      setDeletingUserId(null);
    }
  }

  return {
    users,
    totalUsers,
    loading,
    error,
    actionError,
    deletingUserId,
    searchTerm,
    setSearchTerm,
    page,
    totalPages,
    goToPage,
    handleSoftDeleteUser,
  };
}
