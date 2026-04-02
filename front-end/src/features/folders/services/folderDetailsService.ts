import { api } from '../../../services/api';
import type { FileItem, FolderDetails } from '../../../shared/types';

// ── Params & Payloads ────────────────────────────────────

export type CreateSubFolderPayload = {
  name: string;
  userId: string;
  folderId: string;
};

export type UploadFilePayload = {
  file: File;
  name: string;
  folderId: string;
};

// ── Service ──────────────────────────────────────────────

export const folderDetailsService = {
  getById(id: string): Promise<FolderDetails> {
    return api
      .get<FolderDetails>(`/folders/${id}`)
      .then((r) => r.data);
  },

  createSubFolder(payload: CreateSubFolderPayload): Promise<void> {
    return api
      .post('/folders', payload)
      .then(() => undefined);
  },

  downloadFile(fileId: string): Promise<Blob> {
    return api
      .get<Blob>(`/files/${fileId}/download`, { responseType: 'blob' })
      .then((r) => r.data);
  },

  uploadFile(payload: UploadFilePayload): Promise<FileItem> {
    const form = new FormData();
    form.append('file', payload.file);
    form.append('name', payload.name);
    form.append('folderId', payload.folderId);
    return api
      .post<FileItem>('/files/upload', form)
      .then((r) => r.data);
  },
};
