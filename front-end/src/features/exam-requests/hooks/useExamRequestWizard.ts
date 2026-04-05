import { useState, useEffect, useCallback } from 'react';
import type { ExamItem, UserItem } from '../../../shared/types';
import { generateExamRequestPDF } from '../utils/generateExamRequestPDF';
import { usersService } from '../../users/services/usersService';
import { examsService } from '../../exams/services/examsService';
import { examRequestsService } from '../services/examRequestsService';
import { getApiErrorMessage } from '../../../shared/utils/apiUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WizardStep = 1 | 2 | 3 | 4;

export type UseExamRequestWizardReturn = {
  // Data
  users: UserItem[];
  exams: ExamItem[];
  loadingData: boolean;

  // Step
  currentStep: WizardStep;
  canAdvance: boolean;

  // Selections
  selectedUserId: string | null;
  selectedExamIds: string[];
  indication: string;
  userQuery: string;
  examQuery: string;

  // Derived
  selectedUser: UserItem | null;
  selectedExams: ExamItem[];
  filteredUsers: UserItem[];
  filteredExams: ExamItem[];

  // Submission
  submitting: boolean;
  submitted: boolean;
  error: string | null;

  // Actions
  setSelectedUserId: (id: string | null) => void;
  toggleExam: (id: string) => void;
  setIndication: (value: string) => void;
  setUserQuery: (q: string) => void;
  setExamQuery: (q: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  handleSubmit: () => Promise<void>;
  resetWizard: () => void;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useExamRequestWizard(): UseExamRequestWizardReturn {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [indication, setIndication] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [examQuery, setExamQuery] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load users + exams once on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [usersRes, examsRes] = await Promise.all([
          usersService.list({ limit: 100 }),
          examsService.list({ limit: 100 }),
        ]);

        if (cancelled) return;

        const all = Array.isArray(usersRes) ? usersRes : usersRes.data;
        setUsers(all.filter((u) => u.role === 'USER'));
        setExams(examsRes.data);
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Erro ao carregar dados.'));
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Derived values
  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
  const selectedExams = exams.filter((e) => selectedExamIds.includes(e.id));

  const filteredUsers = userQuery.trim()
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(userQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(userQuery.toLowerCase()),
      )
    : users;

  const filteredExams = examQuery.trim()
    ? exams.filter(
        (e) =>
          e.name.toLowerCase().includes(examQuery.toLowerCase()) ||
          e.code.toLowerCase().includes(examQuery.toLowerCase()),
      )
    : exams;

  const canAdvance =
    currentStep === 1 ? selectedUserId !== null :
    currentStep === 2 ? selectedExamIds.length > 0 :
    true;

  const toggleExam = useCallback((id: string) => {
    setSelectedExamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const nextStep = useCallback(() => {
    if (canAdvance && currentStep < 4) {
      setCurrentStep((s) => (s + 1) as WizardStep);
    }
  }, [canAdvance, currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((s) => (s - 1) as WizardStep);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (!selectedUserId || selectedExamIds.length === 0 || !selectedUser) return;

    setSubmitting(true);
    setError(null);

    try {
      await examRequestsService.create({
        examIds: selectedExamIds,
        indication: indication.trim() || undefined,
        targetUserId: selectedUserId,
      });

      generateExamRequestPDF(selectedUser, selectedExams, indication);
      setSubmitted(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao criar solicitação.'));
    } finally {
      setSubmitting(false);
    }
  }, [selectedUserId, selectedExamIds, indication, selectedUser, selectedExams]);

  const resetWizard = useCallback(() => {
    setCurrentStep(1);
    setSelectedUserId(null);
    setSelectedExamIds([]);
    setIndication('');
    setUserQuery('');
    setExamQuery('');
    setSubmitted(false);
    setError(null);
  }, []);

  return {
    users,
    exams,
    loadingData,
    currentStep,
    canAdvance,
    selectedUserId,
    selectedExamIds,
    indication,
    userQuery,
    examQuery,
    selectedUser,
    selectedExams,
    filteredUsers,
    filteredExams,
    submitting,
    submitted,
    error,
    setSelectedUserId,
    toggleExam,
    setIndication,
    setUserQuery,
    setExamQuery,
    nextStep,
    prevStep,
    handleSubmit,
    resetWizard,
  };
}
