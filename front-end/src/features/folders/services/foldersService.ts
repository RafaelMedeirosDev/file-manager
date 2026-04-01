import { api } from '../../../services/api';
import type { FolderDetails, FolderItem, ListResponse } from '../../../shared/types';

// ── Params & Payloads ────────────────────────────────────

export type ListFoldersParams = {
  rootsOnly?: boolean;
  folderId?: string;
  page?: number;
  limit?: number;
};

export type CreateFolderPayload = {
  name: string;
  userId: string;
  folderId?: string;
};

export type UpdateFolderPayload = {
  name: string;
};

// ── Service ──────────────────────────────────────────────

export const foldersService = {
  list(params: ListFoldersParams): Promise<ListResponse<FolderItem> | FolderItem[]> {
    return api
      .get<ListResponse<FolderItem> | FolderItem[]>('/folders', { params })
      .then((r) => r.data);
  },

  getById(id: string): Promise<FolderDetails> {
    return api
      .get<FolderDetails>(`/folders/${id}`)
      .then((r) => r.data);
  },

  create(payload: CreateFolderPayload): Promise<FolderItem> {
    return api
      .post<FolderItem>('/folders', payload)
      .then((r) => r.data);
  },

  update(id: string, payload: UpdateFolderPayload): Promise<FolderItem> {
    return api
      .patch<FolderItem>(`/folders/${id}`, payload)
      .then((r) => r.data);
  },

  softDelete(id: string): Promise<void> {
    return api
      .delete(`/folders/${id}`)
      .then(() => undefined);
  },
};
