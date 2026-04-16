import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { getApiErrorMessage } from '../../../shared/utils/apiUtils';
import type { ExplorerEntry, FolderDetails } from '../../../shared/types';
import { folderDetailsService } from '../services/folderDetailsService';
import { useSidebarContext } from '../contexts/SidebarContext';

export type UploadQueueItem = {
  localId: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
};

// ── Types internos do hook ───────────────────────────────

type UseFolderDetailsReturn = {
  // Dados
  folder: FolderDetails | null;
  entries: ExplorerEntry[];

  // Estados
  loading: boolean;
  error: string | null;
  actionError: string | null;
  creatingFolder: boolean;
  downloadingFileId: string | null;

  // Formulário de criação de subpasta
  newFolderName: string;
  setNewFolderName: (name: string) => void;

  // Filtro de busca
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  // Upload queue
  uploadQueue: UploadQueueItem[];
  addFilesToQueue: (files: File[]) => void;
  removeFromQueue: (localId: string) => void;
  clearQueue: () => void;
  handleBulkUpload: () => Promise<void>;
  uploading: boolean;

  // Ações
  handleCreateSubFolder: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleDownload: (fileId: string, fileName: string, extension: string) => Promise<void>;
};

// ── Hook ────────────────────────────────────────────────

export function useFolderDetails(): UseFolderDetailsReturn {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const { refreshSidebar, expandToFolder, selectUser } = useSidebarContext();

  const [folder, setFolder] = useState<FolderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [uploading, setUploading] = useState(false);

  // ── Fetch da pasta ───────────────────────────────────

  const fetchFolder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await folderDetailsService.getById(id);
      setFolder(data);
      expandToFolder([...data.ancestors.map((a) => a.id), data.id]);
      selectUser(data.userId);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao carregar pasta.'));
    } finally {
      setLoading(false);
    }
  }, [id, expandToFolder, selectUser]);

  // ── Reset ao mudar de pasta ──────────────────────────

  useEffect(() => {
    setNewFolderName('');
    setActionError(null);
    setCreatingFolder(false);
    setDownloadingFileId(null);
    setSearchTerm('');
  }, [id]);

  useEffect(() => {
    void fetchFolder();
  }, [fetchFolder]);

  // ── Entradas filtradas da pasta ──────────────────────

  const entries = useMemo((): ExplorerEntry[] => {
    if (!folder) return [];

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const rawChildren = (
      (folder as FolderDetails & { subfolders?: FolderDetails['children']; folders?: FolderDetails['children'] }).children
      ?? (folder as FolderDetails & { subfolders?: FolderDetails['children']; folders?: FolderDetails['children'] }).subfolders
      ?? (folder as FolderDetails & { subfolders?: FolderDetails['children']; folders?: FolderDetails['children'] }).folders
      ?? []
    );

    const folders = rawChildren
      .filter((child) =>
        normalizedSearch ? child.name.toLowerCase().includes(normalizedSearch) : true,
      )
      .map<ExplorerEntry>((child) => ({ type: 'folder', id: child.id, name: child.name }));

    const files = folder.files
      .filter((file) => {
        if (!normalizedSearch) return true;
        return `${file.name}.${file.extension}`.toLowerCase().includes(normalizedSearch);
      })
      .map<ExplorerEntry>((file) => ({
        type: 'file',
        id: file.id,
        name: file.name,
        extension: file.extension,
      }));

    return [...folders, ...files];
  }, [folder, searchTerm]);

  // ── Ações ────────────────────────────────────────────

  async function handleCreateSubFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !id || !folder) return;

    setActionError(null);
    setCreatingFolder(true);

    try {
      const ownerId = user.role === 'ADMIN' ? folder.userId : user.id;
      await folderDetailsService.createSubFolder({ name: newFolderName, userId: ownerId, folderId: id });
      setNewFolderName('');
      refreshSidebar();
      await fetchFolder();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Não foi possível criar a pasta.'));
    } finally {
      setCreatingFolder(false);
    }
  }

  const addFilesToQueue = useCallback((files: File[]) => {
    setUploadQueue((prev) => [
      ...prev,
      ...files.map((file) => ({
        localId: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        status: 'pending' as const,
      })),
    ]);
  }, []);

  const removeFromQueue = useCallback((localId: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.localId !== localId));
  }, []);

  const clearQueue = useCallback(() => {
    setUploadQueue([]);
  }, []);

  async function handleBulkUpload() {
    if (!id) return;
    const pending = uploadQueue.filter((item) => item.status === 'pending');
    if (pending.length === 0) return;

    setUploading(true);
    setActionError(null);

    setUploadQueue((prev) =>
      prev.map((item) =>
        item.status === 'pending' ? { ...item, status: 'uploading' } : item,
      ),
    );

    try {
      const res = await folderDetailsService.bulkUploadFiles(
        pending.map((item) => item.file),
        id,
      );

      setUploadQueue((prev) =>
        prev.map((item) => {
          const result = res.results.find(
            (r) => r.name === item.file.name.replace(/\.[^.]+$/, ''),
          );
          if (!result) return item;
          return result.error
            ? { ...item, status: 'error', error: result.error }
            : { ...item, status: 'success' };
        }),
      );

      // Atualização otimista: já exibe os arquivos enviados na lista sem depender de refresh manual.
      setFolder((prev) => {
        if (!prev) return prev;

        const now = new Date().toISOString();
        const incomingFiles = res.results
          .filter((result): result is { id: string; url: string; name: string; extension: string; error?: string } =>
            Boolean(result.id && result.url && !result.error),
          )
          .map((result) => ({
            id: result.id,
            name: result.name,
            userId: prev.userId,
            folderId: prev.id,
            extension: result.extension,
            url: result.url,
            createdAt: now,
            updatedAt: now,
          }));

        if (incomingFiles.length === 0) return prev;

        const existingIds = new Set(prev.files.map((file) => file.id));
        const uniqueIncoming = incomingFiles.filter((file) => !existingIds.has(file.id));

        if (uniqueIncoming.length === 0) return prev;

        return {
          ...prev,
          files: [...uniqueIncoming, ...prev.files],
        };
      });

      await fetchFolder();
    } catch (err) {
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.status === 'uploading'
            ? { ...item, status: 'error', error: 'Falha no envio' }
            : item,
        ),
      );
      setActionError(getApiErrorMessage(err, 'Não foi possível fazer o upload dos arquivos.'));
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(fileId: string, fileName: string, extension: string) {
    setActionError(null);
    setDownloadingFileId(fileId);

    try {
      const blob = await folderDetailsService.downloadFile(fileId);
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

  // ── Retorno ──────────────────────────────────────────

  return {
    folder,
    entries,
    loading,
    error,
    actionError,
    creatingFolder,
    downloadingFileId,
    newFolderName,
    setNewFolderName,
    searchTerm,
    setSearchTerm,
    uploadQueue,
    addFilesToQueue,
    removeFromQueue,
    clearQueue,
    handleBulkUpload,
    uploading,
    handleCreateSubFolder,
    handleDownload,
  };
}
