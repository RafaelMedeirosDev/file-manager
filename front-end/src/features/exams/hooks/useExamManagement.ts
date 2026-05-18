import { useEffect, useState } from 'react';
import type { ExamCategory } from '@file-manager/shared';
import type { ExamItem } from '../../../shared/types';
import { examsService } from '../services/examsService';
import { getApiErrorMessage } from '../../../shared/utils/apiUtils';

const PAGE_LIMIT = 10;

export function useExamManagement() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<ExamCategory | ''>('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const res = await examsService.list({ page, limit: PAGE_LIMIT });
        setExams(res.data);
        setTotal(res.meta.total);
        setTotalPages(Math.max(1, Math.ceil(res.meta.total / PAGE_LIMIT)));
      } catch (err) {
        setError(getApiErrorMessage(err, 'Erro ao carregar exames.'));
      } finally {
        setLoading(false);
      }
    }
    void fetch();
  }, [page, reloadKey]);

  function goToPage(p: number) {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return;

    setCreating(true);
    setCreateError(null);
    try {
      await examsService.create({ name: name.trim(), code: code.trim().toUpperCase(), category });
      setName('');
      setCode('');
      setCategory('');
      setPage(1);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setCreateError(getApiErrorMessage(err, 'Erro ao cadastrar exame.'));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, examName: string) {
    const confirmed = window.confirm(`Deseja realmente excluir o exame "${examName}"?`);
    if (!confirmed) return;

    setActionError(null);
    setDeletingId(id);
    try {
      await examsService.softDelete(id);
      const nextTotal = total - 1;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / PAGE_LIMIT));
      setPage((p) => (p > nextTotalPages ? nextTotalPages : p));
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Erro ao excluir exame.'));
    } finally {
      setDeletingId(null);
    }
  }

  return {
    exams, total, page, totalPages, loading, error,
    name, setName,
    code, setCode,
    category, setCategory,
    creating, createError,
    deletingId, actionError,
    goToPage, handleCreate, handleDelete,
  };
}
