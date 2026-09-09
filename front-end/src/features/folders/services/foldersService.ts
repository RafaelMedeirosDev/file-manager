import { api } from '../../../services/api';
import type { FolderItem, ListResponse } from '../../../shared/types';

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

// ── Service ──────────────────────────────────────────────

export const foldersService = {
  list(
    params: ListFoldersParams,
  ): Promise<ListResponse<FolderItem> | FolderItem[]> {
    return api
      .get<ListResponse<FolderItem> | FolderItem[]>('/folders', { params })
      .then((r) => r.data);
  },

  create(payload: CreateFolderPayload): Promise<FolderItem> {
    return api.post<FolderItem>('/folders', payload).then((r) => r.data);
  },

  softDelete(id: string): Promise<void> {
    return api.delete(`/folders/${id}`).then(() => undefined);
  },
};
