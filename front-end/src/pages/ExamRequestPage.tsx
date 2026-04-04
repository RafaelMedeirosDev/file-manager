import { useExamRequestWizard } from '../features/exam-requests/hooks/useExamRequestWizard';
import type { WizardStep } from '../features/exam-requests/hooks/useExamRequestWizard';
import type { UserItem } from '../shared/types';

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

// ── Step label map ────────────────────────────────────────────────────────────

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Paciente',
  2: 'Exames',
  3: 'Indicação',
  4: 'Revisão',
};

// ── Inline styles ─────────────────────────────────────────────────────────────

const STYLES = `
@keyframes er-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes er-check-draw {
  from { stroke-dashoffset: 60; }
  to   { stroke-dashoffset: 0; }
}

@keyframes er-badge-in {
  from { opacity: 0; transform: scale(0.8); }
  to   { opacity: 1; transform: scale(1); }
}

/* ── Wizard card ─────────────────────────────── */
.er-card {
  background: #ffffff;
  border: 1px solid #e8ecf0;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(13, 30, 53, 0.07), 0 1px 4px rgba(13, 30, 53, 0.04);
  overflow: hidden;
  max-width: 680px;
  margin: 0 auto;
}

/* ── Stepper ─────────────────────────────────── */
.er-stepper {
  display: flex;
  align-items: flex-start;
  padding: 24px 28px 20px;
  border-bottom: 1px solid #f0f4f8;
  background: #fafbfc;
}

.er-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.er-step:last-child { flex: 0; }

.er-step-circle {
  width: 34px; height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  transition: background 0.25s, color 0.25s, box-shadow 0.25s;
}

.er-step-circle.future {
  background: #f1f5f9;
  color: #94a3b8;
}

.er-step-circle.active {
  background: #0078D4;
  color: #ffffff;
  box-shadow: 0 0 0 5px rgba(0, 120, 212, 0.15);
}

.er-step-circle.done {
  background: #0078D4;
  color: #ffffff;
}

.er-step-label {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 600;
  margin-top: 7px;
  white-space: nowrap;
  color: #94a3b8;
  transition: color 0.2s;
}

.er-step-label.active { color: #0078D4; }
.er-step-label.done   { color: #0078D4; }

.er-connector {
  flex: 1;
  height: 2px;
  margin: 16px 8px 0;
  background: #e8ecf0;
  border-radius: 1px;
  transition: background 0.3s;
}

.er-connector.done { background: #0078D4; }

/* ── Body ────────────────────────────────────── */
.er-body {
  padding: 24px 28px;
  min-height: 360px;
  animation: er-fade-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.er-step-title {
  font-family: 'Manrope', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #0d1e35;
  margin: 0 0 3px 0;
  letter-spacing: -0.02em;
}

.er-step-desc {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #64748b;
  margin: 0 0 18px 0;
}

/* ── Search wrapper ──────────────────────────── */
.er-search-wrap {
  position: relative;
  margin-bottom: 14px;
}

.er-search-wrap svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.er-search {
  width: 100%;
  border: 1px solid #dde5ed;
  border-radius: 9px;
  padding: 9px 12px 9px 36px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #0d1e35;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.er-search::placeholder { color: #94a3b8; }

.er-search:focus {
  border-color: #0078D4;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.10);
}

/* ── Patient list ────────────────────────────── */
.er-patient-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e8ecf0;
  border-radius: 10px;
  scrollbar-width: thin;
  scrollbar-color: #e0e8f0 transparent;
}

.er-patient-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-bottom: 1px solid #f0f4f8;
  cursor: pointer;
  transition: background 0.12s;
  position: relative;
}

.er-patient-row:last-child { border-bottom: none; }

.er-patient-row::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: #0078D4;
  border-radius: 0 2px 2px 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.er-patient-row:hover { background: #f7fafd; }
.er-patient-row.selected { background: #f0f7fe; }
.er-patient-row.selected::before { opacity: 1; }

.er-patient-name {
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #0d1e35;
  margin: 0;
}

.er-patient-email {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #94a3b8;
  margin: 1px 0 0 0;
}

.er-patient-check {
  margin-left: auto;
  color: #0078D4;
  flex-shrink: 0;
  opacity: 0;
  transform: scale(0.7);
  transition: opacity 0.15s, transform 0.15s;
}

.er-patient-row.selected .er-patient-check {
  opacity: 1;
  transform: scale(1);
}

/* ── Exam cards grid ─────────────────────────── */
.er-exam-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.er-exam-card {
  border: 2px solid #e8ecf0;
  border-radius: 10px;
  padding: 13px;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
  position: relative;
  background: #ffffff;
  user-select: none;
}

.er-exam-card:hover {
  border-color: #a8c8ed;
  box-shadow: 0 2px 10px rgba(0, 120, 212, 0.08);
}

.er-exam-card.selected {
  border-color: #0078D4;
  background: #f0f7fe;
}

.er-exam-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 9px;
}

.er-exam-code {
  display: inline-block;
  background: #e8f3fb;
  color: #005a9e;
  border: 1px solid #cce4f7;
  border-radius: 5px;
  padding: 3px 7px;
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.er-exam-check {
  color: #0078D4;
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.15s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.er-exam-card.selected .er-exam-check {
  opacity: 1;
  transform: scale(1);
}

.er-exam-name {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #0d1e35;
  line-height: 1.35;
  margin: 0 0 4px 0;
}

.er-exam-category {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  margin: 0;
}

/* ── Indication step ─────────────────────────── */
.er-summary-bar {
  background: #f8fafc;
  border: 1px solid #e8ecf0;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.er-summary-label {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #94a3b8;
}

.er-summary-value {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #0d1e35;
}

.er-summary-pipe {
  color: #dde5ed;
  font-size: 12px;
}

.er-exam-badge {
  display: inline-flex;
  align-items: center;
  background: #e8f3fb;
  color: #005a9e;
  border: 1px solid #cce4f7;
  border-radius: 5px;
  padding: 2px 7px;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
}

.er-label {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  margin: 0 0 6px 0;
  display: block;
}

.er-optional {
  font-weight: 400;
  color: #94a3b8;
  margin-left: 4px;
}

.er-textarea {
  width: 100%;
  border: 1px solid #dde5ed;
  border-radius: 9px;
  padding: 10px 12px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #0d1e35;
  background: #f8fafc;
  outline: none;
  resize: none;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  line-height: 1.6;
}

.er-textarea::placeholder { color: #94a3b8; }

.er-textarea:focus {
  border-color: #0078D4;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.10);
}

.er-char-count {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: #94a3b8;
  text-align: right;
  margin-top: 5px;
}

/* ── Review step ─────────────────────────────── */
.er-review-dl {
  margin: 0;
}

.er-review-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 8px;
  padding: 11px 0;
  border-bottom: 1px solid #f0f4f8;
  align-items: baseline;
}

.er-review-row:last-child { border-bottom: none; }

.er-review-dt {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.er-review-dd {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #0d1e35;
  font-weight: 600;
  margin: 0;
}

.er-review-indication {
  font-weight: 400;
  line-height: 1.6;
}

.er-review-none {
  font-style: italic;
  color: #94a3b8;
  font-weight: 400;
}

.er-review-exams {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.er-review-exam-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.er-review-exam-name {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #0d1e35;
}

/* ── Footer ──────────────────────────────────── */
.er-footer {
  padding: 16px 28px;
  border-top: 1px solid #f0f4f8;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafbfc;
}

/* ── Success screen ──────────────────────────── */
.er-success {
  padding: 52px 28px;
  text-align: center;
  animation: er-fade-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.er-success-icon {
  width: 68px; height: 68px;
  border-radius: 50%;
  background: #d1fae5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.er-success-icon svg {
  stroke-dasharray: 60;
  animation: er-check-draw 0.5s 0.1s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.er-success-title {
  font-family: 'Manrope', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #065f46;
  letter-spacing: -0.02em;
  margin: 0 0 6px 0;
}

.er-success-subtitle {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #64748b;
  margin: 0 0 20px 0;
  line-height: 1.6;
}

.er-success-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin-bottom: 28px;
}

.er-success-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #e8f3fb;
  color: #005a9e;
  border: 1px solid #cce4f7;
  border-radius: 6px;
  padding: 4px 9px;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 700;
  animation: er-badge-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

/* ── Empty state ─────────────────────────────── */
.er-empty {
  text-align: center;
  padding: 32px 16px;
  color: #94a3b8;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
}

/* ── Error ───────────────────────────────────── */
.er-error {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #e11d48;
  margin-bottom: 14px;
}

/* ── Loading ─────────────────────────────────── */
.er-loading {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #94a3b8;
  padding: 32px 28px;
  text-align: center;
}

@media (max-width: 580px) {
  .er-exam-grid { grid-template-columns: 1fr; }
  .er-review-row { grid-template-columns: 1fr; gap: 3px; }
  .er-stepper { padding: 18px 16px 16px; }
  .er-body { padding: 18px 16px; }
  .er-footer { padding: 14px 16px; }
}
`;

// ── Sub-components ────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Stepper({ currentStep, submitted }: { currentStep: WizardStep; submitted: boolean }) {
  if (submitted) return null;

  const steps: WizardStep[] = [1, 2, 3, 4];

  function circleClass(step: WizardStep) {
    if (currentStep > step) return 'done';
    if (currentStep === step) return 'active';
    return 'future';
  }

  function labelClass(step: WizardStep) {
    if (currentStep > step) return 'done';
    if (currentStep === step) return 'active';
    return '';
  }

  return (
    <div className="er-stepper" role="navigation" aria-label="Etapas">
      {steps.map((step, i) => (
        <div key={step} style={{ display: 'contents' }}>
          <div className="er-step">
            <div className={`er-step-circle ${circleClass(step)}`}>
              {currentStep > step ? <CheckIcon size={15} /> : step}
            </div>
            <div className={`er-step-label ${labelClass(step)}`}>
              {STEP_LABELS[step]}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className={`er-connector ${currentStep > step ? 'done' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Patient avatar (reuses styles.css av-* classes) ───────────────────────────

function PatientAvatar({ user }: { user: UserItem }) {
  return (
    <div
      className={`users-avatar ${getAvatarColor(user.name)}`}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {getInitials(user.name)}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ExamRequestPage() {
  const {
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
  } = useExamRequestWizard();

  return (
    <>
      <style>{STYLES}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Nova Solicitação</h1>
          <p className="page-subtitle">Crie uma solicitação de exames em nome de um paciente.</p>
        </div>
      </div>

      <div className="page-content">
        {error && !submitted && (
          <p className="er-error">{error}</p>
        )}

        <div className="er-card">
          {/* ── Stepper ── */}
          <Stepper currentStep={currentStep} submitted={submitted} />

          {/* ── Body ── */}
          {loadingData ? (
            <div className="er-loading">Carregando dados…</div>
          ) : submitted ? (
            /* ── SUCCESS ─────────────────────────────────────── */
            <div className="er-success">
              <div className="er-success-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                  stroke="#059669" strokeWidth="2.5" strokeLinecap="round"
                  strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" strokeDasharray="60" />
                </svg>
              </div>
              <h2 className="er-success-title">Solicitação Enviada!</h2>
              <p className="er-success-subtitle">
                <strong>{selectedExams.length}</strong> exame{selectedExams.length !== 1 ? 's' : ''} solicitado{selectedExams.length !== 1 ? 's' : ''} para{' '}
                <strong>{selectedUser?.name}</strong>. O PDF foi gerado automaticamente.
              </p>
              <div className="er-success-badges">
                {selectedExams.map((exam, i) => (
                  <span
                    key={exam.id}
                    className="er-success-badge"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    {exam.code} · {exam.name}
                  </span>
                ))}
              </div>
              <button type="button" className="btn-secondary" onClick={resetWizard}>
                Nova Solicitação
              </button>
            </div>
          ) : (
            <>
              <div className="er-body" key={currentStep}>

                {/* ── STEP 1: Patient ─────────────────────────── */}
                {currentStep === 1 && (
                  <>
                    <p className="er-step-title">Selecione o Paciente</p>
                    <p className="er-step-desc">
                      Busque e selecione o paciente para esta solicitação.
                    </p>
                    <div className="er-search-wrap">
                      <SearchIcon />
                      <input
                        className="er-search"
                        type="text"
                        placeholder="Buscar por nome ou email…"
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div className="er-patient-list" role="listbox" aria-label="Pacientes">
                      {filteredUsers.length === 0 ? (
                        <div className="er-empty">Nenhum paciente encontrado.</div>
                      ) : (
                        filteredUsers.map((u) => {
                          const isSelected = selectedUserId === u.id;
                          return (
                            <div
                              key={u.id}
                              className={`er-patient-row ${isSelected ? 'selected' : ''}`}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => setSelectedUserId(u.id)}
                            >
                              <PatientAvatar user={u} />
                              <div style={{ minWidth: 0 }}>
                                <p className="er-patient-name">{u.name}</p>
                                <p className="er-patient-email">{u.email}</p>
                              </div>
                              <div className="er-patient-check">
                                <CheckIcon size={16} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}

                {/* ── STEP 2: Exams ──────────────────────────── */}
                {currentStep === 2 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                      <p className="er-step-title" style={{ margin: 0 }}>Selecione os Exames</p>
                      {selectedExamIds.length > 0 && (
                        <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#0078D4', fontWeight: 600 }}>
                          {selectedExamIds.length} selecionado{selectedExamIds.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="er-step-desc">
                      Escolha um ou mais exames para{' '}
                      <strong style={{ color: '#0d1e35' }}>{selectedUser?.name}</strong>.
                    </p>
                    <div className="er-search-wrap">
                      <SearchIcon />
                      <input
                        className="er-search"
                        type="text"
                        placeholder="Buscar por nome ou código…"
                        value={examQuery}
                        onChange={(e) => setExamQuery(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div className="er-exam-grid">
                      {filteredExams.length === 0 ? (
                        <div className="er-empty" style={{ gridColumn: '1 / -1' }}>
                          Nenhum exame encontrado.
                        </div>
                      ) : (
                        filteredExams.map((exam) => {
                          const isSelected = selectedExamIds.includes(exam.id);
                          return (
                            <div
                              key={exam.id}
                              className={`er-exam-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => toggleExam(exam.id)}
                              role="checkbox"
                              aria-checked={isSelected}
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && toggleExam(exam.id)}
                            >
                              <div className="er-exam-card-top">
                                <span className="er-exam-code">{exam.code}</span>
                                <span className="er-exam-check">
                                  <CheckIcon size={16} />
                                </span>
                              </div>
                              <p className="er-exam-name">{exam.name}</p>
                              <p className="er-exam-category">{exam.category}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}

                {/* ── STEP 3: Indication ─────────────────────── */}
                {currentStep === 3 && (
                  <>
                    <p className="er-step-title">Indicação Clínica</p>
                    <p className="er-step-desc">
                      Informe a indicação, urgência ou instruções especiais.
                    </p>
                    <div className="er-summary-bar">
                      <span className="er-summary-label">Paciente:</span>
                      <span className="er-summary-value">{selectedUser?.name}</span>
                      <span className="er-summary-pipe">·</span>
                      <span className="er-summary-label">Exames:</span>
                      {selectedExams.map((exam) => (
                        <span key={exam.id} className="er-exam-badge">{exam.code}</span>
                      ))}
                    </div>
                    <label className="er-label">
                      Indicação
                      <span className="er-optional">(opcional)</span>
                    </label>
                    <textarea
                      className="er-textarea"
                      rows={5}
                      maxLength={500}
                      placeholder="Ex.: Paciente em jejum. Prioridade: urgente. Resultado anterior de jan/2026 apresentou LDL elevado."
                      value={indication}
                      onChange={(e) => setIndication(e.target.value)}
                    />
                    <p className="er-char-count">{indication.length} / 500</p>
                  </>
                )}

                {/* ── STEP 4: Review ─────────────────────────── */}
                {currentStep === 4 && (
                  <>
                    <p className="er-step-title">Revisão e Confirmação</p>
                    <p className="er-step-desc">
                      Verifique os dados antes de confirmar a solicitação.
                    </p>
                    <dl className="er-review-dl">
                      <div className="er-review-row">
                        <dt className="er-review-dt">Paciente</dt>
                        <dd className="er-review-dd">{selectedUser?.name}</dd>
                      </div>
                      <div className="er-review-row">
                        <dt className="er-review-dt">E-mail</dt>
                        <dd className="er-review-dd" style={{ fontWeight: 400 }}>
                          {selectedUser?.email}
                        </dd>
                      </div>
                      <div className="er-review-row">
                        <dt className="er-review-dt">Exames</dt>
                        <dd className="er-review-dd">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {selectedExams.map((exam) => (
                              <div key={exam.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span className="er-review-exam-name">{exam.name}</span>
                                <span className="er-exam-badge">{exam.code}</span>
                                <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                                  {exam.category}
                                </span>
                              </div>
                            ))}
                          </div>
                        </dd>
                      </div>
                      <div className="er-review-row">
                        <dt className="er-review-dt">Indicação</dt>
                        <dd className="er-review-dd">
                          {indication.trim() ? (
                            <span className="er-review-indication">{indication}</span>
                          ) : (
                            <span className="er-review-none">Nenhuma indicação informada</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </>
                )}

              </div>

              {/* ── Footer ─────────────────────────────────────── */}
              <div className="er-footer">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={prevStep}
                    style={{ fontSize: 13 }}
                  >
                    ← Voltar
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={nextStep}
                    disabled={!canAdvance}
                    style={{ fontSize: 13, padding: '8px 20px' }}
                  >
                    Próximo →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{ fontSize: 13, padding: '8px 20px', background: '#059669' }}
                  >
                    {submitting ? 'Enviando…' : 'Confirmar Solicitação'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
