import { useState, useCallback } from 'react';
import type { ExamRequestItem } from '../../../shared/types';
import { examRequestsService } from '../services/examRequestsService';
import { generateExamRequestPDF } from '../utils/generateExamRequestPDF';
import { getApiErrorMessage } from '../../../shared/utils/apiUtils';

export type UseEditExamRequestReturn = {
  isOpen: boolean;
  current: ExamRequestItem | null;
  selectedExamIds: string[];
  indication: string;
  submitting: boolean;
  error: string | null;
  awaitingDownload: boolean;

  open: (request: ExamRequestItem) => void;
  close: () => void;
  toggleExam: (id: string) => void;
  setIndication: (v: string) => void;
  handleSubmit: () => Promise<void>;
  downloadAndClose: () => void;
  skipAndClose: () => void;
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
  const [awaitingDownload, setAwaitingDownload] = useState(false);
  const [updatedRequest, setUpdatedRequest] = useState<ExamRequestItem | null>(null);

  const open = useCallback((request: ExamRequestItem) => {
    setCurrent(request);
    setSelectedExamIds(request.exams.map((e) => e.id));
    setIndication(request.indication);
    setError(null);
    setAwaitingDownload(false);
    setUpdatedRequest(null);
    setIsOpen(true);
  }, []);

  const reset = useCallback(() => {
    setIsOpen(false);
    setCurrent(null);
    setError(null);
    setAwaitingDownload(false);
    setUpdatedRequest(null);
  }, []);

  const close = useCallback(() => {
    // If awaiting download decision, skip download and close
    if (awaitingDownload && updatedRequest) {
      onSuccess(updatedRequest);
    }
    reset();
  }, [awaitingDownload, updatedRequest, onSuccess, reset]);

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
      setUpdatedRequest(updated);
      setAwaitingDownload(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao atualizar solicitação.'));
    } finally {
      setSubmitting(false);
    }
  }, [current, indication, selectedExamIds]);

  const downloadAndClose = useCallback(() => {
    if (!updatedRequest) return;
    generateExamRequestPDF(updatedRequest.user, updatedRequest.exams, updatedRequest.indication);
    onSuccess(updatedRequest);
    reset();
  }, [updatedRequest, onSuccess, reset]);

  const skipAndClose = useCallback(() => {
    if (!updatedRequest) return;
    onSuccess(updatedRequest);
    reset();
  }, [updatedRequest, onSuccess, reset]);

  return {
    isOpen,
    current,
    selectedExamIds,
    indication,
    submitting,
    error,
    awaitingDownload,
    open,
    close,
    toggleExam,
    setIndication,
    handleSubmit,
    downloadAndClose,
    skipAndClose,
  };
}
