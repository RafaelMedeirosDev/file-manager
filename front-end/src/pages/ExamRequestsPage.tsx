import { useRef, useState, useEffect } from 'react';
import { useExamRequests } from '../features/exam-requests/hooks/useExamRequests';
import { useEditExamRequest } from '../features/exam-requests/hooks/useEditExamRequest';
import type { ExamItem } from '../shared/types';

// ── Avatar helpers (mirrors UsersPage) ───────────────────────────────────────

const AVATAR_COLORS = [
  'av-blue', 'av-indigo', 'av-violet', 'av-teal',
  'av-amber', 'av-rose', 'av-green', 'av-orange',
] as const;

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

const EXAM_CATEGORY_LABEL: Record<string, string> = {
  THROMBOPHILIA: 'Trombofilia',
  MICROBIOLOGY: 'Microbiologia',
  ENDOCRINE_METABOLIC: 'Endócrino / Metabólico',
  IMMUNOLOGY: 'Imunologia',
  OBSTETRIC_MARKERS: 'Marcadores Obstétricos',
  IMAGING: 'Imagem',
  BIOCHEMISTRY: 'Bioquímica',
  HEMATOLOGY: 'Hematologia',
};

// ── Inline styles ─────────────────────────────────────────────────────────────

const STYLES = `
@keyframes erl-row-in {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes erl-dropdown-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}

/* ── Filter bar ──────────────────────────────── */
.erl-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--shell-border);
  flex-wrap: wrap;
}

.erl-filter-label {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: #94a3b8;
  white-space: nowrap;
  margin-right: 2px;
}

.erl-filter-input {
  border: 1px solid #dde5ed;
  border-radius: 8px;
  padding: 7px 10px;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #0d1e35;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  height: 34px;
}

.erl-filter-input:focus {
  border-color: #0078D4;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.10);
}

.erl-filter-input.active {
  border-color: #0078D4;
  background: #f0f7fe;
  color: #005a9e;
  font-weight: 600;
}

.erl-filter-select {
  border: 1px solid #dde5ed;
  border-radius: 8px;
  padding: 7px 28px 7px 10px;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #0d1e35;
  background: #f8fafc url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 10px center;
  appearance: none;
  outline: none;
  cursor: pointer;
  height: 34px;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  min-width: 140px;
}

.erl-filter-select:focus {
  border-color: #0078D4;
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.10);
}

.erl-filter-select.active {
  border-color: #0078D4;
  background-color: #f0f7fe;
  color: #005a9e;
  font-weight: 600;
}

/* ── Exam multi-select dropdown ──────────────── */
.erl-exam-select-wrap {
  position: relative;
}

.erl-exam-select-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #dde5ed;
  border-radius: 8px;
  padding: 7px 10px;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #0d1e35;
  background: #f8fafc;
  outline: none;
  cursor: pointer;
  height: 34px;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  white-space: nowrap;
  min-width: 120px;
  justify-content: space-between;
}

.erl-exam-select-btn:focus,
.erl-exam-select-btn.open {
  border-color: #0078D4;
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.10);
}

.erl-exam-select-btn.active {
  border-color: #0078D4;
  background: #f0f7fe;
  color: #005a9e;
  font-weight: 600;
}

.erl-exam-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 50;
  background: #ffffff;
  border: 1px solid #e0e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(13, 30, 53, 0.12), 0 2px 6px rgba(13, 30, 53, 0.06);
  min-width: 240px;
  max-height: 240px;
  overflow-y: auto;
  animation: erl-dropdown-in 0.18s cubic-bezier(0.22, 1, 0.36, 1) both;
  scrollbar-width: thin;
  scrollbar-color: #e0e8f0 transparent;
}

.erl-exam-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid #f4f7fa;
}

.erl-exam-option:last-child { border-bottom: none; }
.erl-exam-option:hover { background: #f7fafd; }

.erl-exam-option input[type="checkbox"] {
  width: 15px; height: 15px;
  accent-color: #0078D4;
  cursor: pointer;
  flex-shrink: 0;
}

.erl-exam-option-code {
  display: inline-block;
  background: #e8f3fb;
  color: #005a9e;
  border: 1px solid #cce4f7;
  border-radius: 4px;
  padding: 1px 6px;
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.erl-exam-option-name {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #0d1e35;
  font-weight: 500;
}

.erl-filter-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #0078D4;
  color: #fff;
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.erl-filter-chevron {
  color: #94a3b8;
  flex-shrink: 0;
  transition: transform 0.18s;
}

.erl-exam-select-btn.open .erl-filter-chevron {
  transform: rotate(180deg);
}

/* ── Clear button ────────────────────────────── */
.erl-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 1px solid transparent;
  border-radius: 7px;
  padding: 5px 10px;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  cursor: pointer;
  height: 34px;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  white-space: nowrap;
}

.erl-clear-btn:hover {
  background: #fff1f2;
  color: #e11d48;
  border-color: #fecdd3;
}

.erl-clear-btn.hidden { visibility: hidden; pointer-events: none; }

/* ── Edit button ─────────────────────────────── */
.erl-btn-edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid #dde5ed;
  border-radius: 7px;
  padding: 5px 10px;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  height: 30px;
  gap: 5px;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  white-space: nowrap;
}

.erl-btn-edit:hover {
  background: #f0f7fe;
  border-color: #0078D4;
  color: #0078D4;
}

/* ── Table header ────────────────────────────── */
.erl-table-head {
  display: grid;
  grid-template-columns: 220px 1fr 200px 100px 80px;
  padding: 0 20px;
  border-bottom: 1px solid var(--shell-border);
  background: #fafbfc;
}

.erl-table-head-cell {
  padding: 10px 0;
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: #94a3b8;
}

/* ── Result count ────────────────────────────── */
.erl-result-count {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  white-space: nowrap;
  margin-left: auto;
  flex-shrink: 0;
}

/* ── Rows ────────────────────────────────────── */
.erl-row {
  display: grid;
  grid-template-columns: 220px 1fr 200px 100px 80px;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid #f0f4f8;
  cursor: default;
  transition: background 0.12s;
  position: relative;
  animation: erl-row-in 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.erl-row:last-child { border-bottom: none; }

.erl-row::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2px;
  background: #0078D4;
  opacity: 0;
  transition: opacity 0.15s;
}

.erl-row:hover { background: #f7fafd; }
.erl-row:hover::before { opacity: 1; }

.erl-row:nth-child(1) { animation-delay: 0.03s; }
.erl-row:nth-child(2) { animation-delay: 0.06s; }
.erl-row:nth-child(3) { animation-delay: 0.09s; }
.erl-row:nth-child(4) { animation-delay: 0.12s; }
.erl-row:nth-child(5) { animation-delay: 0.15s; }
.erl-row:nth-child(n+6) { animation-delay: 0.17s; }

/* ── Cell: patient ───────────────────────────── */
.erl-cell-patient {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px 0;
  min-width: 0;
}

.erl-patient-name {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #0d1e35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.erl-patient-email {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 2px 0 0 0;
}

/* ── Cell: exams ─────────────────────────────── */
.erl-cell-exams {
  padding: 13px 16px 13px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  min-width: 0;
}

.erl-exam-badge {
  display: inline-flex;
  align-items: center;
  background: #e8f3fb;
  color: #005a9e;
  border: 1px solid #cce4f7;
  border-radius: 5px;
  padding: 2px 7px;
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

/* ── Cell: indication ────────────────────────── */
.erl-cell-indication {
  padding: 13px 16px 13px 0;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.erl-cell-indication.empty {
  color: #cbd5e1;
  font-style: italic;
}

/* ── Exam overflow badge ─────────────────────── */
.erl-exam-badge-more {
  display: inline-flex;
  align-items: center;
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  padding: 2px 7px;
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

/* ── Expanded panel ──────────────────────────── */
@keyframes erl-expand-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.erl-expand-panel {
  background: #f7fafd;
  border-bottom: 1px solid #e0e8f0;
  border-top: 1px solid #e8f0f7;
  padding: 18px 24px 20px;
  animation: erl-expand-in 0.18s cubic-bezier(0.22, 1, 0.36, 1) both;
  display: grid;
  grid-template-columns: 220px 1fr 1fr;
  gap: 20px;
}

.erl-expand-section-label {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #94a3b8;
  margin: 0 0 8px 0;
}

.erl-expand-patient-name {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #0d1e35;
  margin: 0 0 3px 0;
}

.erl-expand-patient-email {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: #64748b;
  margin: 0 0 6px 0;
}

.erl-expand-date {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: #94a3b8;
  margin: 0;
}

.erl-expand-exams {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.erl-expand-exam-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.erl-expand-exam-name {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #0d1e35;
  font-weight: 500;
}

.erl-expand-indication {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #475569;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.erl-expand-indication.empty {
  color: #cbd5e1;
  font-style: italic;
}

/* Row is clickable when expander is present */
.erl-row.expandable { cursor: pointer; }

/* ── Cell: date ──────────────────────────────── */
.erl-cell-date {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
}

/* ── Empty state ─────────────────────────────── */
.erl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 32px;
  gap: 10px;
}

.erl-empty-icon {
  width: 44px; height: 44px;
  background: #f1f5f9;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  margin-bottom: 4px;
}

.erl-empty h3 {
  font-family: 'Manrope', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #0d1e35;
  margin: 0;
}

.erl-empty p {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  margin: 0;
}

/* ── Loading skeleton ────────────────────────── */
.erl-skeleton-row {
  display: grid;
  grid-template-columns: 220px 1fr 200px 100px 80px;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid #f0f4f8;
  gap: 16px;
}

@keyframes erl-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.erl-skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f0f4f8 25%, #e8ecf0 50%, #f0f4f8 75%);
  background-size: 800px 100%;
  animation: erl-shimmer 1.4s infinite linear;
}

@media (max-width: 860px) {
  .erl-table-head { display: none; }
  .erl-row {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 14px 16px;
  }
  .erl-cell-patient { padding: 0; }
  .erl-cell-exams, .erl-cell-indication, .erl-cell-date {
    padding: 0;
  }
  .erl-skeleton-row { grid-template-columns: 1fr; }
}

/* ── Edit Modal ──────────────────────────────── */
@keyframes erm-overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes erm-dialog-in {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}

.erm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(13, 30, 53, 0.45);
  backdrop-filter: blur(3px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: erm-overlay-in 0.18s ease both;
}

.erm-dialog {
  background: #ffffff;
  border-radius: 14px;
  width: 480px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(13, 30, 53, 0.18), 0 4px 12px rgba(13, 30, 53, 0.08);
  animation: erm-dialog-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
  overflow: hidden;
}

.erm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 16px;
  border-bottom: 1px solid #f0f4f8;
  flex-shrink: 0;
}

.erm-title {
  font-family: 'Manrope', sans-serif;
  font-size: 15px;
  font-weight: 800;
  color: #0d1e35;
  margin: 0;
}

.erm-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: none;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  color: #94a3b8;
  transition: background 0.12s, color 0.12s;
}

.erm-close:hover {
  background: #f1f5f9;
  color: #475569;
}

.erm-body {
  padding: 20px 22px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.erm-field-label {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  margin: 0 0 7px 0;
  display: block;
}

.erm-textarea {
  width: 100%;
  border: 1px solid #dde5ed;
  border-radius: 8px;
  padding: 10px 12px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #0d1e35;
  background: #f8fafc;
  outline: none;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  box-sizing: border-box;
}

.erm-textarea:focus {
  border-color: #0078D4;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.10);
}

.erm-exam-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border: 1px solid #dde5ed;
  border-radius: 8px;
  overflow: hidden;
  max-height: 220px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e0e8f0 transparent;
}

.erm-exam-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid #f4f7fa;
}

.erm-exam-item:last-child { border-bottom: none; }
.erm-exam-item:hover { background: #f7fafd; }

.erm-exam-item input[type="checkbox"] {
  width: 15px; height: 15px;
  accent-color: #0078D4;
  cursor: pointer;
  flex-shrink: 0;
}

.erm-exam-code {
  display: inline-block;
  background: #e8f3fb;
  color: #005a9e;
  border: 1px solid #cce4f7;
  border-radius: 4px;
  padding: 1px 6px;
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.erm-exam-name {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #0d1e35;
  font-weight: 500;
}

.erm-error {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #e11d48;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 7px;
  padding: 9px 12px;
}

.erm-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid #f0f4f8;
  flex-shrink: 0;
}

.erm-btn-cancel {
  background: none;
  border: 1px solid #dde5ed;
  border-radius: 8px;
  padding: 8px 16px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}

.erm-btn-cancel:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.erm-btn-save {
  background: #0078D4;
  border: none;
  border-radius: 8px;
  padding: 8px 18px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  transition: background 0.12s, opacity 0.12s;
}

.erm-btn-save:hover:not(:disabled) { background: #0063b1; }
.erm-btn-save:disabled { opacity: 0.55; cursor: default; }
`;

// ── Chevron icon ──────────────────────────────────────────────────────────────

function ChevronDown() {
  return (
    <svg className="erl-filter-chevron" width="12" height="8" viewBox="0 0 12 8"
      fill="none" aria-hidden="true">
      <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

// ── Edit icon ─────────────────────────────────────────────────────────────────

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

type EditModalProps = {
  isOpen: boolean;
  indication: string;
  selectedExamIds: string[];
  submitting: boolean;
  error: string | null;
  awaitingDownload: boolean;
  allExams: ExamItem[];
  onClose: () => void;
  onToggleExam: (id: string) => void;
  onSetIndication: (v: string) => void;
  onSubmit: () => void;
  onDownload: () => void;
  onSkipDownload: () => void;
};

function EditExamRequestModal({
  isOpen, indication, selectedExamIds, submitting, error, awaitingDownload,
  allExams, onClose, onToggleExam, onSetIndication, onSubmit, onDownload, onSkipDownload,
}: EditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="erm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="erm-dialog" role="dialog" aria-modal="true" aria-labelledby="erm-title">
        {/* Header */}
        <div className="erm-header">
          <h2 className="erm-title" id="erm-title">
            {awaitingDownload ? 'Solicitação Atualizada' : 'Editar Solicitação'}
          </h2>
          <button type="button" className="erm-close" onClick={onClose} aria-label="Fechar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {awaitingDownload ? (
          /* ── Download prompt ── */
          <>
            <div className="erm-body" style={{ alignItems: 'center', textAlign: 'center', padding: '32px 22px' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: '#e8f3fb', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="#0078D4" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <p style={{
                fontFamily: 'Manrope, sans-serif', fontSize: 14, fontWeight: 700,
                color: '#0d1e35', margin: '0 0 6px',
              }}>
                Deseja baixar a solicitação atualizada?
              </p>
              <p style={{
                fontFamily: 'Manrope, sans-serif', fontSize: 12,
                color: '#94a3b8', margin: 0,
              }}>
                As alterações foram salvas. Você pode baixar o PDF atualizado agora ou depois.
              </p>
            </div>
            <div className="erm-footer">
              <button type="button" className="erm-btn-cancel" onClick={onSkipDownload}>
                Não, obrigado
              </button>
              <button type="button" className="erm-btn-save" onClick={onDownload}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true"
                  style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Baixar PDF
              </button>
            </div>
          </>
        ) : (
          /* ── Edit form ── */
          <>
            <div className="erm-body">
              {/* Indication */}
              <div>
                <label className="erm-field-label" htmlFor="erm-indication">Indicação</label>
                <textarea
                  id="erm-indication"
                  className="erm-textarea"
                  placeholder="Descreva a indicação clínica (opcional)"
                  value={indication}
                  onChange={(e) => onSetIndication(e.target.value)}
                  maxLength={500}
                />
              </div>

              {/* Exams */}
              <div>
                <label className="erm-field-label">Exames</label>
                <div className="erm-exam-list">
                  {allExams.map((exam) => (
                    <label key={exam.id} className="erm-exam-item">
                      <input
                        type="checkbox"
                        checked={selectedExamIds.includes(exam.id)}
                        onChange={() => onToggleExam(exam.id)}
                      />
                      <span className="erm-exam-code">{exam.code}</span>
                      <span className="erm-exam-name">{exam.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && <p className="erm-error">{error}</p>}
            </div>

            <div className="erm-footer">
              <button type="button" className="erm-btn-cancel" onClick={onClose} disabled={submitting}>
                Cancelar
              </button>
              <button
                type="button"
                className="erm-btn-save"
                onClick={onSubmit}
                disabled={submitting || selectedExamIds.length === 0}
              >
                {submitting ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[80, 60, 90, 50, 70].map((w, i) => (
        <div key={i} className="erl-skeleton-row">
          <div className="erl-skeleton-line" style={{ width: `${w}%` }} />
          <div className="erl-skeleton-line" style={{ width: '55%' }} />
          <div className="erl-skeleton-line" style={{ width: '70%' }} />
          <div className="erl-skeleton-line" style={{ width: '60%' }} />
          <div className="erl-skeleton-line" style={{ width: '40%' }} />
        </div>
      ))}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ExamRequestsPage() {
  const {
    requests, total, loading, error,
    users, exams,
    dateFrom, dateTo, userId, selectedExamIds,
    setDateFrom, setDateTo, setUserId,
    toggleExamFilter, clearFilters,
    updateRequest,
  } = useExamRequests();

  const edit = useEditExamRequest(updateRequest);

  const [examDropOpen, setExamDropOpen] = useState(false);
  const examDropRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const hasFilters = dateFrom || dateTo || userId || selectedExamIds.length > 0;

  // Close exam dropdown on outside click
  useEffect(() => {
    if (!examDropOpen) return;

    function handleClick(e: MouseEvent) {
      if (examDropRef.current && !examDropRef.current.contains(e.target as Node)) {
        setExamDropOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [examDropOpen]);

  return (
    <>
      <style>{STYLES}</style>

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Solicitações de Exames</h1>
          <p className="page-subtitle">Histórico e acompanhamento de todas as solicitações.</p>
        </div>
      </div>

      <div className="page-content">
        {error && (
          <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#e11d48', marginBottom: 12 }}>
            {error}
          </p>
        )}

        <div className="users-panel">

          {/* ── Filter bar ──────────────────────────────────── */}
          <div className="erl-filters">
            <span className="erl-filter-label">Filtros</span>

            {/* Date from */}
            <input
              type="date"
              className={`erl-filter-input${dateFrom ? ' active' : ''}`}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="Data inicial"
              style={{ width: 138 }}
            />

            <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: '#cbd5e1' }}>–</span>

            {/* Date to */}
            <input
              type="date"
              className={`erl-filter-input${dateTo ? ' active' : ''}`}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="Data final"
              style={{ width: 138 }}
            />

            {/* User select */}
            <select
              className={`erl-filter-select${userId ? ' active' : ''}`}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Todos os pacientes</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>

            {/* Exam multi-select */}
            <div className="erl-exam-select-wrap" ref={examDropRef}>
              <button
                type="button"
                className={`erl-exam-select-btn${examDropOpen ? ' open' : ''}${selectedExamIds.length > 0 ? ' active' : ''}`}
                onClick={() => setExamDropOpen((o) => !o)}
              >
                <span>
                  {selectedExamIds.length === 0 ? 'Exames' : `Exames`}
                </span>
                {selectedExamIds.length > 0 && (
                  <span className="erl-filter-count-badge">{selectedExamIds.length}</span>
                )}
                <ChevronDown />
              </button>

              {examDropOpen && (
                <div className="erl-exam-dropdown" role="listbox" aria-multiselectable="true">
                  {exams.length === 0 ? (
                    <div style={{ padding: '12px 14px', fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#94a3b8' }}>
                      Nenhum exame disponível
                    </div>
                  ) : (
                    exams.map((exam) => (
                      <label
                        key={exam.id}
                        className="erl-exam-option"
                        role="option"
                        aria-selected={selectedExamIds.includes(exam.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedExamIds.includes(exam.id)}
                          onChange={() => toggleExamFilter(exam.id)}
                        />
                        <span className="erl-exam-option-code">{exam.code}</span>
                        <span className="erl-exam-option-name">{exam.name}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Clear filters */}
            <button
              type="button"
              className={`erl-clear-btn${!hasFilters ? ' hidden' : ''}`}
              onClick={clearFilters}
            >
              ✕ Limpar
            </button>

            {/* Result count */}
            <span className="erl-result-count">
              {loading ? '…' : `${total} solicitação${total !== 1 ? 'ões' : ''}`}
            </span>
          </div>

          {/* ── Table header ────────────────────────────────── */}
          <div className="erl-table-head">
            <div className="erl-table-head-cell">Paciente</div>
            <div className="erl-table-head-cell">Exames</div>
            <div className="erl-table-head-cell">Indicação</div>
            <div className="erl-table-head-cell">Data</div>
            <div className="erl-table-head-cell"></div>
          </div>

          {/* ── Rows ────────────────────────────────────────── */}
          {loading ? (
            <SkeletonRows />
          ) : requests.length === 0 ? (
            <div className="erl-empty">
              <div className="erl-empty-icon"><EmptyIcon /></div>
              <h3>Nenhuma solicitação encontrada</h3>
              <p>
                {hasFilters
                  ? 'Tente ajustar os filtros para ver mais resultados.'
                  : 'Nenhuma solicitação de exame registrada ainda.'}
              </p>
            </div>
          ) : (
            requests.map((req) => {
              const isExpanded = expandedId === req.id;
              const visibleExams = req.exams.slice(0, 6);
              const hiddenCount = req.exams.length - 6;

              return (
                <div key={req.id}>
                  {/* ── Main row ── */}
                  <div
                    className="erl-row expandable"
                    onClick={() => toggleExpand(req.id)}
                    aria-expanded={isExpanded}
                  >
                    {/* Patient */}
                    <div className="erl-cell-patient">
                      <div
                        className={`users-avatar ${getAvatarColor(req.user.name)}`}
                        aria-hidden="true"
                        style={{ flexShrink: 0 }}
                      >
                        {getInitials(req.user.name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p className="erl-patient-name">{req.user.name}</p>
                        <p className="erl-patient-email">{req.user.email}</p>
                      </div>
                    </div>

                    {/* Exams — max 6 */}
                    <div className="erl-cell-exams">
                      {visibleExams.map((exam) => (
                        <span key={exam.id} className="erl-exam-badge">{exam.code}</span>
                      ))}
                      {hiddenCount > 0 && (
                        <span className="erl-exam-badge-more">+{hiddenCount}</span>
                      )}
                    </div>

                    {/* Indication — max 25 chars */}
                    <div className={`erl-cell-indication${!req.indication ? ' empty' : ''}`}>
                      {req.indication ? truncate(req.indication, 25) : 'Sem indicação'}
                    </div>

                    {/* Date */}
                    <div className="erl-cell-date">{formatDate(req.createdAt)}</div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="erl-btn-edit"
                        onClick={(e) => { e.stopPropagation(); edit.open(req); }}
                        title="Editar solicitação"
                      >
                        <EditIcon />
                        Editar
                      </button>
                    </div>
                  </div>

                  {/* ── Expanded panel ── */}
                  {isExpanded && (
                    <div className="erl-expand-panel">
                      {/* Patient */}
                      <div>
                        <p className="erl-expand-section-label">Paciente</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div
                            className={`users-avatar ${getAvatarColor(req.user.name)}`}
                            style={{ flexShrink: 0 }}
                            aria-hidden="true"
                          >
                            {getInitials(req.user.name)}
                          </div>
                          <div>
                            <p className="erl-expand-patient-name">{req.user.name}</p>
                            <p className="erl-expand-patient-email">{req.user.email}</p>
                          </div>
                        </div>
                        <p className="erl-expand-date">Criado em {formatDateTime(req.createdAt)}</p>
                      </div>

                      {/* Exams — all */}
                      <div>
                        <p className="erl-expand-section-label">
                          Exames ({req.exams.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {req.exams.map((exam) => (
                            <div key={exam.id} className="erl-expand-exam-row">
                              <span className="erl-exam-badge">{exam.code}</span>
                              <span className="erl-expand-exam-name">{exam.name}</span>
                              <span style={{
                                fontFamily: 'Manrope, sans-serif', fontSize: 10,
                                color: '#94a3b8', marginLeft: 2,
                              }}>
                                {EXAM_CATEGORY_LABEL[exam.category] ?? exam.category}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Indication — full */}
                      <div>
                        <p className="erl-expand-section-label">Indicação</p>
                        <p className={`erl-expand-indication${!req.indication ? ' empty' : ''}`}>
                          {req.indication || 'Sem indicação'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

        </div>
      </div>

      {/* ── Edit modal ──────────────────────────────────────── */}
      <EditExamRequestModal
        isOpen={edit.isOpen}
        indication={edit.indication}
        selectedExamIds={edit.selectedExamIds}
        submitting={edit.submitting}
        error={edit.error}
        awaitingDownload={edit.awaitingDownload}
        allExams={exams}
        onClose={edit.close}
        onToggleExam={edit.toggleExam}
        onSetIndication={edit.setIndication}
        onSubmit={edit.handleSubmit}
        onDownload={edit.downloadAndClose}
        onSkipDownload={edit.skipAndClose}
      />
    </>
  );
}
