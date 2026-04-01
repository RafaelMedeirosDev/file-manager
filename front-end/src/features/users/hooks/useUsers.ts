import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiErrorMessage, normalizePaginatedResponse } from '../../../shared/utils/apiUtils';
import type { UserItem } from '../../../shared/types';
import { usersService } from '../services/usersService';

// ── Types internos do hook ───────────────────────────────

type UseUsersReturn = {
  // Dados
  users: UserItem[];

  // Estados de lista
  loading: boolean;
  loadingMore: boolean;
  error: string | null;

  // Estados de ação
  actionError: string | null;
  creatingUser: boolean;
  deletingUserId: string | null;

  // Formulário de criação
  newUserName: string;
  setNewUserName: (v: string) => void;
  newUserEmail: string;
  setNewUserEmail: (v: string) => void;
  newUserPassword: string;
  setNewUserPassword: (v: string) => void;

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
  searchName: string;
  setSearchName: (v: string) => void;
  searchEmail: string;
  setSearchEmail: (v: string) => void;

  // Ações
  handleCreateUser: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleSoftDeleteUser: (userId: string, userName: string) => Promise<void>;
  handleChangeOwnPassword: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;

  // Ref para scroll infinito
  sentinelRef: React.RefObject<HTMLDivElement>;
};

// ── Hook ────────────────────────────────────────────────

export function useUsers(): UseUsersReturn {
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

  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Carregamento de uma página ───────────────────────

  const loadUsersPage = useCallback(
    async (page: number, append: boolean) => {
      const params: Record<string, string | number> = { page, limit: 10 };
      if (searchName.trim()) params.name = searchName.trim();
      if (searchEmail.trim()) params.email = searchEmail.trim();

      const raw = await usersService.list(params);
      const parsed = normalizePaginatedResponse<UserItem>(raw, page, 10);

      setUsers((prev) => {
        if (!append) return parsed.items;
        const existingIds = new Set(prev.map((u) => u.id));
        const merged = [...prev];
        for (const item of parsed.items) {
          if (!existingIds.has(item.id)) merged.push(item);
        }
        return merged;
      });

      setCurrentPage(parsed.meta.page);
      setHasNextPage(parsed.isLegacyArray ? false : parsed.meta.hasNextPage);
    },
    [searchName, searchEmail],
  );

  // ── Primeira carga ───────────────────────────────────

  useEffect(() => {
    async function fetchFirstPage() {
      setLoading(true);
      setError(null);
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

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setCreatingUser(true);
    try {
      await usersService.create({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
      });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Erro ao criar usuário.'));
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
    loading,
    loadingMore,
    error,
    actionError,
    creatingUser,
    deletingUserId,
    newUserName,
    setNewUserName,
    newUserEmail,
    setNewUserEmail,
    newUserPassword,
    setNewUserPassword,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    changingPassword,
    passwordError,
    passwordSuccess,
    searchName,
    setSearchName,
    searchEmail,
    setSearchEmail,
    handleCreateUser,
    handleSoftDeleteUser,
    handleChangeOwnPassword,
    sentinelRef,
  };
}
