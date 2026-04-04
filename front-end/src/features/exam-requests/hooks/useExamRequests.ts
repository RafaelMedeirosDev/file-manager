import { useState, useEffect, useCallback, useRef } from 'react';
import type { ExamRequestItem, ExamItem, UserItem } from '../../../shared/types';
import { examRequestsService } from '../services/examRequestsService';
import { examsService } from '../../exams/services/examsService';
import { usersService } from '../../users/services/usersService';
import { getApiErrorMessage } from '../../../shared/utils/apiUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

export type UseExamRequestsReturn = {
  // Data
  requests: ExamRequestItem[];
  total: number;
  loading: boolean;
  error: string | null;

  // Filter options
  users: UserItem[];
  exams: ExamItem[];

  // Active filters
  dateFrom: string;
  dateTo: string;
  userId: string;
  selectedExamIds: string[];

  // Setters
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  setUserId: (v: string) => void;
  toggleExamFilter: (id: string) => void;
  clearFilters: () => void;
  updateRequest: (updated: ExamRequestItem) => void;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useExamRequests(): UseExamRequestsReturn {
  const [requests, setRequests] = useState<ExamRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userId, setUserId] = useState('');
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load filter option data once on mount
  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const [usersRes, examsRes] = await Promise.all([
          usersService.list({ limit: 100 }),
          examsService.list({ limit: 100 }),
        ]);
        if (cancelled) return;
        const all = Array.isArray(usersRes) ? usersRes : usersRes.data;
        setUsers(all.filter((u) => u.role === 'USER'));
        setExams(examsRes.data);
      } catch {
        // non-critical — filter options just won't populate
      }
    }

    loadOptions();
    return () => { cancelled = true; };
  }, []);

  // Fetch exam requests, debounced on filter changes
  const fetchRequests = useCallback(
    (from: string, to: string, uid: string, eids: string[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await examRequestsService.list({
            limit: 100,
            dateFrom: from || undefined,
            dateTo: to || undefined,
            userId: uid || undefined,
            examIds: eids.length > 0 ? eids : undefined,
          });
          setRequests(res.data);
          setTotal(res.meta.total);
        } catch (err) {
          setError(getApiErrorMessage(err, 'Erro ao carregar solicitações.'));
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [],
  );

  useEffect(() => {
    fetchRequests(dateFrom, dateTo, userId, selectedExamIds);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [dateFrom, dateTo, userId, selectedExamIds, fetchRequests]);

  const toggleExamFilter = useCallback((id: string) => {
    setSelectedExamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const clearFilters = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setUserId('');
    setSelectedExamIds([]);
  }, []);

  const updateRequest = useCallback((updated: ExamRequestItem) => {
    setRequests((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  }, []);

  return {
    requests,
    total,
    loading,
    error,
    users,
    exams,
    dateFrom,
    dateTo,
    userId,
    selectedExamIds,
    setDateFrom,
    setDateTo,
    setUserId,
    toggleExamFilter,
    clearFilters,
    updateRequest,
  };
}
