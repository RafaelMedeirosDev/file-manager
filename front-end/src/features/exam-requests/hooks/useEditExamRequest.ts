import { useState, useCallback } from 'react';
import type { ExamRequestItem } from '../../../shared/types';
import { examRequestsService } from '../services/examRequestsService';
import { getApiErrorMessage } from '../../../shared/utils/apiUtils';

export type UseEditExamRequestReturn = {
  isOpen: boolean;
  current: ExamRequestItem | null;
  selectedExamIds: string[];
  indication: string;
  submitting: boolean;
  error: string | null;

  open: (request: ExamRequestItem) => void;
  close: () => void;
  toggleExam: (id: string) => void;
  setIndication: (v: string) => void;
  handleSubmit: () => Promise<void>;
};

export function useEditExamRequest(
  onSuccess: (updated: ExamRequestItem) => void,
): UseEditExamRequestReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState<ExamRequestItem | null>(null);
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [indication, setIndication] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback((request: ExamRequestItem) => {
    setCurrent(request);
    setSelectedExamIds(request.exams.map((e) => e.id));
    setIndication(request.indication);
    setError(null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setCurrent(null);
    setError(null);
  }, []);

  const toggleExam = useCallback((id: string) => {
    setSelectedExamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!current) return;

    setSubmitting(true);
    setError(null);

    try {
      const updated = await examRequestsService.update(current.id, {
        indication: indication.trim() || undefined,
        examIds: selectedExamIds,
      });
      onSuccess(updated);
      setIsOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao atualizar solicitação.'));
    } finally {
      setSubmitting(false);
    }
  }, [current, indication, selectedExamIds, onSuccess]);

  return {
    isOpen,
    current,
    selectedExamIds,
    indication,
    submitting,
    error,
    open,
    close,
    toggleExam,
    setIndication,
    handleSubmit,
  };
}
