import { api } from '../../../services/api';
import type { FolderDetails } from '../../../shared/types';

// ── Params & Payloads ────────────────────────────────────

export type CreateSubFolderPayload = {
  name: string;
  userId: string;
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
};
