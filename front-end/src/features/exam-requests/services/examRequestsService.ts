import { api } from '../../../services/api';
import type { ExamRequestItem } from '../../../shared/types';

// ── Params & Payloads ─────────────────────────────────────

export type ListExamRequestsParams = {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  examIds?: string[];
};

export type ListExamRequestsResponse = {
  data: ExamRequestItem[];
  meta: { page: number; limit: number; total: number; hasNextPage: boolean };
};

export type CreateExamRequestPayload = {
  examIds: string[];
  indication?: string;
  targetUserId?: string;
};

// ── Service ───────────────────────────────────────────────

export const examRequestsService = {
  list(params?: ListExamRequestsParams): Promise<ListExamRequestsResponse> {
    return api
      .get<ListExamRequestsResponse>('/exam-requests', {
        params,
        // Axios serializes arrays as examIds[]=... by default; use repeat style
        paramsSerializer: (p) => {
          const search = new URLSearchParams();
          for (const [key, val] of Object.entries(p)) {
            if (val === undefined || val === null) continue;
            if (Array.isArray(val)) {
              val.forEach((v) => search.append(key, String(v)));
            } else {
              search.append(key, String(val));
            }
          }
          return search.toString();
        },
      })
      .then((r) => r.data);
  },

  getById(id: string): Promise<ExamRequestItem> {
    return api
      .get<ExamRequestItem>(`/exam-requests/${id}`)
      .then((r) => r.data);
  },

  update(id: string, payload: { indication?: string; examIds?: string[] }): Promise<ExamRequestItem> {
    return api
      .patch<ExamRequestItem>(`/exam-requests/${id}`, payload)
      .then((r) => r.data);
  },

  create(payload: CreateExamRequestPayload): Promise<ExamRequestItem> {
    return api
      .post<ExamRequestItem>('/exam-requests', payload)
      .then((r) => r.data);
  },
};
