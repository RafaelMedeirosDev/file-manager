import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { getApiErrorMessage, normalizePaginatedResponse } from '../../../shared/utils/apiUtils';
import type { FileItem, FolderOption, UserOption } from '../../../shared/types';
import { filesService } from '../services/filesService';
import { foldersService } from '../../folders/services/foldersService';
import { usersService } from '../../users/services/usersService';

// ── Types internos do hook ───────────────────────────────

type UseFilesReturn = {
  // Dados
  visibleFiles: FileItem[];
  usersOptions: UserOption[];
  foldersOptions: FolderOption[];
  usersById: Map<string, string>;
  foldersById: Map<string, string>;
  createFolders: FolderOption[];
  filterFolders: FolderOption[];
  extensionOptions: string[];

  // Estados
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  actionError: string | null;
  creatingFile: boolean;
  downloadingFileId: string | null;
  deletingFileId: string | null;

  // Filtros
  filterUserId: string;
  setFilterUserId: (id: string) => void;
  filterFolderId: string;
  setFilterFolderId: (id: string) => void;
  filterFileName: string;
  setFilterFileName: (name: string) => void;
  filterExtension: string;
  setFilterExtension: (ext: string) => void;

  // Formulário de criação
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
  selectedFolderId: string;
  setSelectedFolderId: (id: string) => void;
  newFileName: string;
  setNewFileName: (name: string) => void;
  newFileExtension: string;
  setNewFileExtension: (ext: string) => void;
  newFileUrl: string;
  setNewFileUrl: (url: string) => void;

  // Ações
  handleCreateFile: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleDownload: (fileId: string, fileName: string, extension: string) => Promise<void>;
  handleSoftDeleteFile: (fileId: string, fileName: string) => Promise<void>;

  // Ref para scroll infinito
  sentinelRef: React.RefObject<HTMLDivElement>;
};

// ── Hook ────────────────────────────────────────────────

export function useFiles(): UseFilesReturn {
  const { user } = useAuth();

  const [files, setFiles] = useState<FileItem[]>([]);
  const [usersOptions, setUsersOptions] = useState<UserOption[]>([]);
  const [foldersOptions, setFoldersOptions] = useState<FolderOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [newFileName, setNewFileName] = useState('');
  const [newFileExtension, setNewFileExtension] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [creatingFile, setCreatingFile] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterFolderId, setFilterFolderId] = useState('');
  const [filterFileName, setFilterFileName] = useState('');
  const [filterExtension, setFilterExtension] = useState('');

  const [reloadKey, setReloadKey] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Dados derivados ──────────────────────────────────

  const usersById = useMemo(
    () => new Map(usersOptions.map((u) => [u.id, u.name])),
    [usersOptions],
  );

  const foldersById = useMemo(
    () => new Map(foldersOptions.map((f) => [f.id, f.name])),
    [foldersOptions],
  );

  const createFolders = useMemo(() => {
    if (!selectedUserId) return [];
    return foldersOptions.filter((f) => f.userId === selectedUserId);
  }, [foldersOptions, selectedUserId]);

  const filterFolders = useMemo(() => {
    if (!filterUserId) return foldersOptions;
    return foldersOptions.filter((f) => f.userId === filterUserId);
  }, [foldersOptions, filterUserId]);

  const extensionOptions = useMemo(() => {
    const values = files
      .map((f) => f.extension?.trim().toLowerCase())
      .filter((v): v is string => Boolean(v));
    return Array.from(new Set(values)).sort();
  }, [files]);

  const visibleFiles = useMemo(() => {
    const normalizedName = filterFileName.trim().toLowerCase();
    const normalizedExt  = filterExtension.trim().toLowerCase();
    return files.filter((f) => {
      if (filterUserId   && f.userId   !== filterUserId)   return false;
      if (filterFolderId && f.folderId !== filterFolderId) return false;
      if (normalizedName && !f.name.toLowerCase().includes(normalizedName)) return false;
      if (normalizedExt  && f.extension.toLowerCase() !== normalizedExt)    return false;
      return true;
    });
  }, [files, filterUserId, filterFolderId, filterFileName, filterExtension]);

  // ── Reset de seleção dependente ───────────────────────

  useEffect(() => { setSelectedFolderId(''); }, [selectedUserId]);
  useEffect(() => { setFilterFolderId(''); },  [filterUserId]);

  // ── Carregamento de uma página ───────────────────────

  const loadFilesPage = useCallback(async (page: number, append: boolean) => {
    const raw = await filesService.list({ page, limit: 10 });
    const parsed = normalizePaginatedResponse<FileItem>(raw, page, 10);

    setFiles((prev) => {
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
        await loadFilesPage(1, false);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Erro ao carregar arquivos.'));
      } finally {
        setLoading(false);
      }
    }
    void fetchFirstPage();
  }, [reloadKey, loadFilesPage]);

  // ── Scroll infinito ──────────────────────────────────

  useEffect(() => {
    if (!sentinelRef.current || loading || loadingMore || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setLoadingMore(true);
        void loadFilesPage(currentPage + 1, true)
          .catch((err) => setError(getApiErrorMessage(err, 'Erro ao carregar mais arquivos.')))
          .finally(() => setLoadingMore(false));
      },
      { rootMargin: '180px' },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [currentPage, hasNextPage, loading, loadingMore, loadFilesPage]);

  // ── Carga de pastas e usuários (opções para formulário) ──

  useEffect(() => {
    async function fetchAllFolders() {
      const pageLimit = 100;
      let page = 1;
      let hasMore = true;
      const all: FolderOption[] = [];
      while (hasMore) {
        const raw = await foldersService.list({ page, limit: pageLimit });
        const parsed = normalizePaginatedResponse<FolderOption>(raw, page, pageLimit);
        all.push(...parsed.items);
        hasMore = parsed.isLegacyArray ? false : parsed.meta.hasNextPage;
        page += 1;
      }
      return all;
    }

    async function fetchAllUsers() {
      const pageLimit = 100;
      let page = 1;
      let hasMore = true;
      const all: UserOption[] = [];
      while (hasMore) {
        const raw = await usersService.list({ page, limit: pageLimit });
        const parsed = normalizePaginatedResponse<UserOption>(raw, page, pageLimit);
        all.push(...parsed.items);
        hasMore = parsed.isLegacyArray ? false : parsed.meta.hasNextPage;
        page += 1;
      }
      return all;
    }

    async function fetchOptions() {
      try {
        if (user?.role === 'ADMIN') {
          const [allUsers, allFolders] = await Promise.all([fetchAllUsers(), fetchAllFolders()]);
          setUsersOptions(allUsers);
          setFoldersOptions(allFolders);
          if (allUsers.length > 0) setSelectedUserId(allUsers[0].id);
          return;
        }
        const allFolders = await fetchAllFolders();
        setFoldersOptions(allFolders);
      } catch (err) {
        setActionError(getApiErrorMessage(err, 'Não foi possível carregar usuários e pastas.'));
      }
    }

    void fetchOptions();
  }, [user?.role]);

  // ── Ações ────────────────────────────────────────────

  async function handleCreateFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || user.role !== 'ADMIN') return;

    if (!selectedUserId) {
      setActionError('Selecione um usuário para criar o arquivo.');
      return;
    }
    if (!selectedFolderId) {
      setActionError('Selecione uma pasta para criar o arquivo.');
      return;
    }

    setActionError(null);
    setCreatingFile(true);

    try {
      await filesService.create({
        name: newFileName,
        userId: selectedUserId,
        folderId: selectedFolderId,
        extension: newFileExtension,
        url: newFileUrl,
      });
      setNewFileName('');
      setNewFileExtension('');
      setNewFileUrl('');
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Erro ao criar arquivo.'));
    } finally {
      setCreatingFile(false);
    }
  }

  async function handleDownload(fileId: string, fileName: string, extension: string) {
    setActionError(null);
    setDownloadingFileId(fileId);

    try {
      const blob = await filesService.download(fileId);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${fileName}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Não foi possível baixar o arquivo.'));
    } finally {
      setDownloadingFileId(null);
    }
  }

  async function handleSoftDeleteFile(fileId: string, fileName: string) {
    const confirmed = window.confirm(`Deseja realmente excluir o arquivo "${fileName}"?`);
    if (!confirmed) return;

    setActionError(null);
    setDeletingFileId(fileId);

    try {
      await filesService.softDelete(fileId);
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Não foi possível excluir o arquivo.'));
    } finally {
      setDeletingFileId(null);
    }
  }

  // ── Retorno ──────────────────────────────────────────

  return {
    visibleFiles,
    usersOptions,
    foldersOptions,
    usersById,
    foldersById,
    createFolders,
    filterFolders,
    extensionOptions,
    loading,
    loadingMore,
    error,
    actionError,
    creatingFile,
    downloadingFileId,
    deletingFileId,
    filterUserId,
    setFilterUserId,
    filterFolderId,
    setFilterFolderId,
    filterFileName,
    setFilterFileName,
    filterExtension,
    setFilterExtension,
    selectedUserId,
    setSelectedUserId,
    selectedFolderId,
    setSelectedFolderId,
    newFileName,
    setNewFileName,
    newFileExtension,
    setNewFileExtension,
    newFileUrl,
    setNewFileUrl,
    handleCreateFile,
    handleDownload,
    handleSoftDeleteFile,
    sentinelRef,
  };
}
