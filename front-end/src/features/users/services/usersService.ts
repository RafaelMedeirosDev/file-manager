import { api } from '../../../services/api';
import type { ListResponse, UserItem } from '../../../shared/types';

// ── Params & Payloads ────────────────────────────────────

export type ListUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  name?: string;
  email?: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  folders?: string[];
};

export type ChangeOwnPasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

// ── Service ──────────────────────────────────────────────

export const usersService = {
  list(params: ListUsersParams): Promise<ListResponse<UserItem> | UserItem[]> {
    return api
      .get<ListResponse<UserItem> | UserItem[]>('/users', { params })
      .then((r) => r.data);
  },

  create(payload: CreateUserPayload): Promise<UserItem> {
    return api
      .post<UserItem>('/users', payload)
      .then((r) => r.data);
  },

  changeOwnPassword(payload: ChangeOwnPasswordPayload): Promise<void> {
    return api
      .patch('/users/me/password', payload)
      .then(() => undefined);
  },

  softDelete(id: string): Promise<void> {
    return api
      .delete(`/users/${id}`)
      .then(() => undefined);
  },
};
