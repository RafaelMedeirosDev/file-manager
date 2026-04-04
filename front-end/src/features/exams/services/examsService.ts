import { api } from '../../../services/api';
import type { ExamItem } from '../../../shared/types';
import type { ExamCategory } from '@file-manager/shared';

// ── Params ────────────────────────────────────────────────

export type ListExamsParams = {
  page?: number;
  limit?: number;
  name?: string;
  code?: string;
  category?: ExamCategory;
};

export type ListExamsResponse = {
  data: ExamItem[];
  meta: { page: number; limit: number; total: number; hasNextPage: boolean };
};

// ── Service ───────────────────────────────────────────────

export const examsService = {
  list(params?: ListExamsParams): Promise<ListExamsResponse> {
    return api
      .get<ListExamsResponse>('/exams', { params })
      .then((r) => r.data);
  },
};
