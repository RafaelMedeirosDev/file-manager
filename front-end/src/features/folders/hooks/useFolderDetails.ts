import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { getApiErrorMessage } from '../../../shared/utils/apiUtils';
import type { ExplorerEntry, FolderDetails } from '../../../shared/types';
import { folderDetailsService } from '../services/folderDetailsService';

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
  uploadingFile: boolean;

  // Formulário de criação de subpasta
  newFolderName: string;
  setNewFolderName: (name: string) => void;

  // Filtro de busca
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  // Formulário de upload
  uploadFile: File | null;
  setUploadFile: (file: File | null) => void;
  uploadFileName: string;
  setUploadFileName: (name: string) => void;

  // Ações
  handleCreateSubFolder: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleDownload: (fileId: string, fileName: string, extension: string) => Promise<void>;
  handleUpload: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

// ── Hook ────────────────────────────────────────────────

export function useFolderDetails(): UseFolderDetailsReturn {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();

  const [folder, setFolder] = useState<FolderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // ── Fetch da pasta ───────────────────────────────────

  const fetchFolder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await folderDetailsService.getById(id);
      setFolder(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao carregar pasta.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

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

    const folders = folder.children
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
      await fetchFolder();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Não foi possível criar a pasta.'));
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !uploadFile) return;

    setActionError(null);
    setUploadingFile(true);

    try {
      await folderDetailsService.uploadFile({
        file: uploadFile,
        name: uploadFileName,
        folderId: id,
      });
      setUploadFile(null);
      setUploadFileName('');
      await fetchFolder();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Não foi possível fazer o upload do arquivo.'));
    } finally {
      setUploadingFile(false);
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
    uploadingFile,
    newFolderName,
    setNewFolderName,
    searchTerm,
    setSearchTerm,
    uploadFile,
    setUploadFile,
    uploadFileName,
    setUploadFileName,
    handleCreateSubFolder,
    handleDownload,
    handleUpload,
  };
}
