import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { getApiErrorMessage, normalizePaginatedResponse } from '../../../shared/utils/apiUtils';
import type { FolderItem, UserOption } from '../../../shared/types';
import { foldersService } from '../services/foldersService';
import { usersService } from '../../users/services/usersService';
import { useSidebarContext } from '../contexts/SidebarContext';

// ── Types internos do hook ───────────────────────────────

type UseFoldersReturn = {
  // Dados
  folders: FolderItem[];
  usersOptions: UserOption[];
  visibleFolders: FolderItem[];
  usersById: Map<string, string>;
  folderById: Map<string, FolderItem>;

  // Estados
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  createError: string | null;
  creating: boolean;
  deletingFolderId: string | null;

  // Filtro e seleção
  filterUserId: string;
  setFilterUserId: (id: string) => void;
  selectedCreateUserId: string;
  setSelectedCreateUserId: (id: string) => void;
  selectedDeleteFolderId: string;
  setSelectedDeleteFolderId: (id: string) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;

  // Ações
  handleCreateFolder: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleSoftDeleteFolder: (folderId: string, folderName: string) => Promise<void>;

  // Ref para scroll infinito
  sentinelRef: React.RefObject<HTMLDivElement>;
};

// ── Hook ────────────────────────────────────────────────

export function useFolders(): UseFoldersReturn {
  const { user } = useAuth();
  const { refreshSidebar } = useSidebarContext();

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
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Dados derivados ──────────────────────────────────

  const usersById = useMemo(
    () => new Map(usersOptions.map((u) => [u.id, u.name])),
    [usersOptions],
  );

  const visibleFolders = useMemo(() => {
    if (!filterUserId) return folders;
    return folders.filter((f) => f.userId === filterUserId);
  }, [folders, filterUserId]);

  const folderById = useMemo(
    () => new Map(folders.map((f) => [f.id, f])),
    [folders],
  );

  // ── Limpa seleção de delete quando pasta some da lista ──

  useEffect(() => {
    if (!selectedDeleteFolderId) return;
    const exists = visibleFolders.some((f) => f.id === selectedDeleteFolderId);
    if (!exists) setSelectedDeleteFolderId('');
  }, [selectedDeleteFolderId, visibleFolders]);

  // ── Carregamento de uma página ───────────────────────

  const loadFoldersPage = useCallback(async (page: number, append: boolean) => {
    const raw = await foldersService.list({ rootsOnly: true, page, limit: 10 });
    const parsed = normalizePaginatedResponse<FolderItem>(raw, page, 10);

    setFolders((prev) => {
      if (!append) return parsed.items;
      const existingIds = new Set(prev.map((f) => f.id));
      const merged = [...prev];
      for (const item of parsed.items) {
        if (!existingIds.has(item.id)) merged.push(item);
      }
      return merged;
    });

    setCurrentPage(parsed.meta.page);
    setHasNextPage(parsed.isLegacyArray ? false : parsed.meta.hasNextPage);
  }, []);

  // ── Primeira carga ───────────────────────────────────

  useEffect(() => {
    async function fetchFirstPage() {
      setLoading(true);
      setError(null);
      try {
        await loadFoldersPage(1, false);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Erro ao carregar pastas.'));
      } finally {
        setLoading(false);
      }
    }
    void fetchFirstPage();
  }, [reloadKey, loadFoldersPage]);

  // ── Scroll infinito ──────────────────────────────────

  useEffect(() => {
    if (!sentinelRef.current || loading || loadingMore || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setLoadingMore(true);
        void loadFoldersPage(currentPage + 1, true)
          .catch((err) => setError(getApiErrorMessage(err, 'Erro ao carregar mais pastas.')))
          .finally(() => setLoadingMore(false));
      },
      { rootMargin: '180px' },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [currentPage, hasNextPage, loading, loadingMore, loadFoldersPage]);

  // ── Carga de usuários (só ADMIN) ─────────────────────

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;

    async function fetchAllUsers() {
      const pageLimit = 100;
      let page = 1;
      let hasMore = true;
      const allUsers: UserOption[] = [];

      while (hasMore) {
        const raw = await usersService.list({ page, limit: pageLimit });
        const parsed = normalizePaginatedResponse<UserOption>(raw, page, pageLimit);
        allUsers.push(...parsed.items);
        hasMore = parsed.isLegacyArray ? false : parsed.meta.hasNextPage;
        page += 1;
      }

      return allUsers;
    }

    async function loadUsers() {
      try {
        const users = await fetchAllUsers();
        setUsersOptions(users);
        if (users.length > 0) {
          setSelectedCreateUserId((prev) => prev || users[0].id);
        }
      } catch (err) {
        setError(getApiErrorMessage(err, 'Erro ao carregar usuários.'));
      }
    }

    void loadUsers();
  }, [user?.role]);

  // ── Ações ────────────────────────────────────────────

  async function handleCreateFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    if (user.role === 'ADMIN' && !selectedCreateUserId) {
      setCreateError('Selecione um usuário para criar a pasta.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      await foldersService.create({
        name: newFolderName,
        userId: user.role === 'ADMIN' ? selectedCreateUserId : user.id,
      });
      setNewFolderName('');
      setReloadKey((prev) => prev + 1);
      refreshSidebar();
    } catch (err) {
      setCreateError(getApiErrorMessage(err, 'Erro ao criar pasta.'));
    } finally {
      setCreating(false);
    }
  }

  async function handleSoftDeleteFolder(folderId: string, folderName: string) {
    const confirmed = window.confirm(`Deseja realmente excluir a pasta "${folderName}"?`);
    if (!confirmed) return;

    setCreateError(null);
    setDeletingFolderId(folderId);

    try {
      await foldersService.softDelete(folderId);
      setSelectedDeleteFolderId('');
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      setCreateError(getApiErrorMessage(err, 'Erro ao excluir pasta.'));
    } finally {
      setDeletingFolderId(null);
    }
  }

  // ── Retorno ──────────────────────────────────────────

  return {
    folders,
    usersOptions,
    visibleFolders,
    usersById,
    folderById,
    loading,
    loadingMore,
    error,
    createError,
    creating,
    deletingFolderId,
    filterUserId,
    setFilterUserId,
    selectedCreateUserId,
    setSelectedCreateUserId,
    selectedDeleteFolderId,
    setSelectedDeleteFolderId,
    newFolderName,
    setNewFolderName,
    handleCreateFolder,
    handleSoftDeleteFolder,
    sentinelRef,
  };
}
