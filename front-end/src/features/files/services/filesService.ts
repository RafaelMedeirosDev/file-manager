import { api } from '../../../services/api';
import type { FileItem, ListResponse } from '../../../shared/types';

// ── Params & Payloads ────────────────────────────────────

export type ListFilesParams = {
  folderId?: string;
  page?: number;
  limit?: number;
};

export type CreateFilePayload = {
  name: string;
  userId: string;
  folderId: string;
  extension: string;
  url: string;
};

export type UpdateFilePayload = {
  folderId?: string;
  url?: string;
};

// ── Service ──────────────────────────────────────────────

export const filesService = {
  list(params: ListFilesParams): Promise<ListResponse<FileItem> | FileItem[]> {
    return api
      .get<ListResponse<FileItem> | FileItem[]>('/files', { params })
      .then((r) => r.data);
  },

  create(payload: CreateFilePayload): Promise<FileItem> {
    return api
      .post<FileItem>('/files', payload)
      .then((r) => r.data);
  },

  update(id: string, payload: UpdateFilePayload): Promise<FileItem> {
    return api
      .patch<FileItem>(`/files/${id}`, payload)
      .then((r) => r.data);
  },

  softDelete(id: string): Promise<void> {
    return api
      .delete(`/files/${id}`)
      .then(() => undefined);
  },

  download(id: string): Promise<Blob> {
    return api
      .get<Blob>(`/files/${id}/download`, { responseType: 'blob' })
      .then((r) => r.data);
  },
};
