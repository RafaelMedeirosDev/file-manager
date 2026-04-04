import { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import type { ExamItem, UserItem } from '../../../shared/types';
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

// ── PDF generation ────────────────────────────────────────────────────────────

function generatePDF(user: UserItem, exams: ExamItem[], indication: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const orderNum = 'SOL-' + String(now.getTime()).slice(-6);

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const colW = pageW - margin * 2;
  let y = 0;

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(0, 120, 212);
  doc.rect(0, 0, pageW, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Laboratório Médico', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Solicitação de Exames', margin, 18);
  doc.text(`${dateStr}  ${timeStr}`, pageW - margin, 11, { align: 'right' });
  doc.text(`Solicitação: ${orderNum}`, pageW - margin, 18, { align: 'right' });

  // ── Helpers ──────────────────────────────────────────────
  const sectionTitle = (label: string, yPos: number): number => {
    doc.setFillColor(240, 245, 255);
    doc.rect(margin, yPos, colW, 7, 'F');
    doc.setTextColor(0, 120, 212);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(label.toUpperCase(), margin + 3, yPos + 5);
    return yPos + 11;
  };

  const field = (label: string, value: string, yPos: number, labelW = 40): number => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(label, margin + 3, yPos);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 3 + labelW, yPos);
    return yPos + 6.5;
  };

  // ── Patient ──────────────────────────────────────────────
  y = 36;
  y = sectionTitle('Dados do Paciente', y);
  y = field('Nome', user.name, y);
  y = field('E-mail', user.email, y);
  y += 4;

  // ── Exams table ──────────────────────────────────────────
  y = sectionTitle('Exames Solicitados', y);

  doc.setFillColor(220, 230, 255);
  doc.rect(margin, y - 1, colW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 120, 212);
  doc.text('#', margin + 3, y + 4);
  doc.text('Código', margin + 10, y + 4);
  doc.text('Exame', margin + 35, y + 4);
  doc.text('Categoria', margin + 120, y + 4);
  y += 9;

  exams.forEach((exam, i) => {
    const rowBg: [number, number, number] = i % 2 === 0 ? [255, 255, 255] : [248, 250, 255];
    doc.setFillColor(...rowBg);
    doc.rect(margin, y - 1, colW, 7, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(String(i + 1), margin + 3, y + 4);

    doc.setTextColor(0, 120, 212);
    doc.setFont('helvetica', 'bold');
    doc.text(exam.code, margin + 10, y + 4);

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(exam.name, margin + 35, y + 4);
    doc.text(exam.category, margin + 120, y + 4);
    y += 7;
  });

  doc.setDrawColor(200, 210, 240);
  doc.rect(margin, y - exams.length * 7 - 9, colW, exams.length * 7 + 9, 'S');
  y += 6;

  // ── Indication ───────────────────────────────────────────
  y = sectionTitle('Indicação', y);
  if (indication.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(indication, colW - 6);
    doc.text(lines, margin + 3, y);
    y += lines.length * 5.5;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(160, 160, 160);
    doc.text('Nenhuma indicação informada.', margin + 3, y);
    y += 7;
  }
  y += 4;

  // ── Signature line ────────────────────────────────────────
  y = Math.max(y, 220);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, margin + 70, y);
  doc.line(margin + 90, y, margin + 160, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text('Médico Solicitante', margin, y + 5);
  doc.text('Data', margin + 90, y + 5);

  // ── Footer ────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(245, 247, 250);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Este documento é confidencial e destinado exclusivamente ao paciente identificado.',
    pageW / 2,
    pageH - 8,
    { align: 'center' },
  );
  doc.text(
    `Gerado em ${dateStr} às ${timeStr}  ·  ${orderNum}`,
    pageW / 2,
    pageH - 4,
    { align: 'center' },
  );

  doc.save(`solicitacao-${orderNum}.pdf`);
}

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

      generatePDF(selectedUser, selectedExams, indication);
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
