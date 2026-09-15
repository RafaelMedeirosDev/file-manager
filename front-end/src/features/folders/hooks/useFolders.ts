import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  getApiErrorMessage,
  normalizePaginatedResponse,
} from '../../../shared/utils/apiUtils';
import type { FolderItem, UserOption } from '../../../shared/types';
import { foldersService } from '../services/foldersService';
import { usersService } from '../../users/services/usersService';
import { useSidebarContext } from '../contexts/SidebarContext';

// ── Busca todas as páginas de pastas raiz ────────────────

async function fetchAllRootFolders(): Promise<FolderItem[]> {
  const all: FolderItem[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const raw = await foldersService.list({
      rootsOnly: true,
      page,
      limit: 100,
    });
    const parsed = normalizePaginatedResponse<FolderItem>(raw, page, 100);
    all.push(...parsed.items);
    hasMore = parsed.isLegacyArray ? false : parsed.meta.hasNextPage;
    page += 1;
  }

  return all;
}

// ── Types internos do hook ───────────────────────────────

type UseFoldersReturn = {
  // Seleção — vem da URL, não do contexto. Ver o comentário no corpo do hook.
  selectedUserId: string | null;
  selectUserId: (id: string | null) => void;

  // Dados
  usersOptions: UserOption[];
  visibleFolders: FolderItem[];
  usersById: Map<string, string>;
  folderById: Map<string, FolderItem>;

  // Estados
  loading: boolean;
  error: string | null;
  deleteError: string | null;
  deletingFolderId: string | null;

  // Seleção para exclusão
  selectedDeleteFolderId: string;
  setSelectedDeleteFolderId: (id: string) => void;

  // Ações
  handleSoftDeleteFolder: (
    folderId: string,
    folderName: string,
  ) => Promise<void>;
};

// ── Hook ────────────────────────────────────────────────

export function useFolders(): UseFoldersReturn {
  const { user } = useAuth();
  const { selectUser } = useSidebarContext();

  /**
   * O usuário selecionado vive na URL, e não no SidebarContext.
   *
   * Não é preferência de estilo: o `AppLayout` está declarado DUAS vezes no
   * router -- uma no ramo protegido (`/folders`) e outra no ramo de ADMIN
   * (`/users`). Ir de uma tela à outra remonta o SidebarProvider, e o
   * `selectedUserId`, que é `useState` puro, é destruído exatamente na
   * navegação que precisamos fazer. A URL é a única coisa que atravessa.
   *
   * De quebra, o endereço passa a ser compartilhável e sobrevive ao F5.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUserId = searchParams.get('userId');

  /**
   * Mão única: URL → contexto. O contexto não escreve de volta na URL, e é
   * isso que impede dois efeitos de se alimentarem em laço.
   *
   * `selectUser` continua existindo porque é ele quem abre o acordeão da
   * sidebar (`setExpandedUsers(new Set([id]))`) -- a seleção da grade deixou
   * de depender dele, a aparência da sidebar não.
   */
  useEffect(() => {
    selectUser(selectedUserId);
  }, [selectedUserId, selectUser]);

  function selectUserId(id: string | null) {
    if (id) {
      setSearchParams({ userId: id });
    } else {
      setSearchParams({});
    }
  }

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [usersOptions, setUsersOptions] = useState<UserOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Erro da exclusão fica separado do `error` de carga: `error` substitui a
  // listagem inteira no render, e uma exclusão que falha não deve esconder as
  // pastas que continuam lá.
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [selectedDeleteFolderId, setSelectedDeleteFolderId] = useState('');

  const [reloadKey, setReloadKey] = useState(0);

  // ── Dados derivados ──────────────────────────────────

  const usersById = useMemo(
    () => new Map(usersOptions.map((u) => [u.id, u.name])),
    [usersOptions],
  );

  const visibleFolders = useMemo(() => {
    if (!selectedUserId) return [];
    return folders.filter((f) => f.userId === selectedUserId);
  }, [folders, selectedUserId]);

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

  // ── Auto-seleciona o próprio usuário quando role === 'USER' ──

  // Escreve na URL, e não no contexto, para que o endereço não minta para
  // quem não é ADMIN. `replace` porque isto não é navegação do usuário: ele
  // não deveria precisar de dois "voltar" para sair da tela.
  useEffect(() => {
    if (user?.role === 'USER' && user.id && selectedUserId !== user.id) {
      setSearchParams({ userId: user.id }, { replace: true });
    }
  }, [user?.role, user?.id, selectedUserId, setSearchParams]);

  // ── Carga de pastas (depende de selectedUserId) ──────────

  useEffect(() => {
    if (!selectedUserId) {
      setFolders([]);
      return;
    }

    async function fetchFolders() {
      setLoading(true);
      setError(null);
      try {
        const all = await fetchAllRootFolders();
        setFolders(all);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Erro ao carregar pastas.'));
      } finally {
        setLoading(false);
      }
    }

    void fetchFolders();
  }, [reloadKey, selectedUserId]);

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
        const parsed = normalizePaginatedResponse<UserOption>(
          raw,
          page,
          pageLimit,
        );
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
      } catch (err) {
        setError(getApiErrorMessage(err, 'Erro ao carregar usuários.'));
      }
    }

    void loadUsers();
  }, [user?.role]);

  // ── Ações ────────────────────────────────────────────

  async function handleSoftDeleteFolder(folderId: string, folderName: string) {
    const confirmed = window.confirm(
      `Deseja realmente excluir a pasta "${folderName}"?`,
    );
    if (!confirmed) return;

    setDeleteError(null);
    setDeletingFolderId(folderId);

    try {
      await foldersService.softDelete(folderId);
      setSelectedDeleteFolderId('');
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, 'Erro ao excluir pasta.'));
    } finally {
      setDeletingFolderId(null);
    }
  }

  // ── Retorno ──────────────────────────────────────────

  return {
    selectedUserId,
    selectUserId,
    usersOptions,
    visibleFolders,
    usersById,
    folderById,
    loading,
    error,
    deleteError,
    deletingFolderId,
    selectedDeleteFolderId,
    setSelectedDeleteFolderId,
    handleSoftDeleteFolder,
  };
}
