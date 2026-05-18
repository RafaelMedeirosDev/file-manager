import { useState } from 'react';
import { ExamCategory } from '@file-manager/shared';
import { useExamManagement } from '../features/exams/hooks/useExamManagement';

// ── Categoria label ───────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  THROMBOPHILIA:      'Trombofilia',
  MICROBIOLOGY:       'Microbiologia',
  ENDOCRINE_METABOLIC:'Endócrino / Metabólico',
  IMMUNOLOGY:         'Imunologia',
  OBSTETRIC_MARKERS:  'Marcadores Obstétricos',
  IMAGING:            'Imagem',
  BIOCHEMISTRY:       'Bioquímica',
  HEMATOLOGY:         'Hematologia',
};

const CATEGORY_OPTIONS = Object.entries(ExamCategory) as [string, string][];

// ── Paginação ─────────────────────────────────────────────

function buildPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

function Pagination({ page, totalPages, total, onPage }: {
  page: number; totalPages: number; total: number; onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = buildPages(page, totalPages);
  const from = (page - 1) * 10 + 1;
  const to = Math.min(page * 10, total);
  return (
    <div className="pagination">
      <span className="pagination-info">{from}–{to} de {total} exame{total !== 1 ? 's' : ''}</span>
      <div className="pagination-controls">
        <button className="pagination-btn" onClick={() => onPage(page - 1)} disabled={page === 1}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="pagination-btn-label" style={{ marginLeft: 4 }}>Anterior</span>
        </button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} className="pagination-ellipsis">…</span>
            : <button key={p} className={`pagination-btn${p === page ? ' active' : ''}`} onClick={() => onPage(p)}>{p}</button>
        )}
        <button className="pagination-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages}>
          <span className="pagination-btn-label" style={{ marginRight: 4 }}>Próxima</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────

export function ExamsPage() {
  const [showForm, setShowForm] = useState(false);
  const {
    exams, total, page, totalPages, loading, error,
    name, setName, code, setCode, category, setCategory,
    creating, createError, deletingId, actionError,
    goToPage, handleCreate, handleDelete,
  } = useExamManagement();

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Exames</h1>
          <p className="page-subtitle">Gerencie o catálogo de exames disponíveis para solicitação.</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          style={{ fontSize: 12, flexShrink: 0 }}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Fechar' : '+ Novo Exame'}
        </button>
      </div>

      {/* Formulário de cadastro */}
      {showForm && (
        <div className="page-expand-panel">
          {createError && (
            <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#e11d48', marginBottom: 12 }}>
              {createError}
            </p>
          )}
          <form onSubmit={handleCreate}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Nome
              </label>
              <input
                className="app-input"
                placeholder="Ex: Hemograma Completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Código
              </label>
              <input
                className="app-input"
                placeholder="Ex: 40303630"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Categoria
              </label>
              <select
                className="app-input"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExamCategory | '')}
                required
              >
                <option value="">Selecione...</option>
                {CATEGORY_OPTIONS.map(([key]) => (
                  <option key={key} value={key}>{CATEGORY_LABEL[key]}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ fontSize: 12 }} disabled={creating}>
              {creating ? 'Salvando...' : 'Cadastrar'}
            </button>
          </form>
        </div>
      )}

      {/* Conteúdo */}
      <div className="page-content">
        {error && (
          <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#e11d48', marginBottom: 12 }}>{error}</p>
        )}
        {actionError && (
          <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#e11d48', marginBottom: 12 }}>{actionError}</p>
        )}

        <div className="users-panel">
          {/* Cabeçalho da tabela */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 200px 100px', padding: '0 20px', borderBottom: '1px solid var(--shell-border)', background: '#fafbfc' }}>
            {['Nome', 'Código', 'Categoria', ''].map((h, i) => (
              <div key={i} style={{ padding: '10px 0', fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', textAlign: i === 3 ? 'right' : 'left' }}>
                {h}
              </div>
            ))}
          </div>

          {/* Linhas */}
          {loading ? (
            <div style={{ padding: '24px 20px', fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#94a3b8' }}>
              Carregando...
            </div>
          ) : exams.length === 0 ? (
            <div className="users-empty-state">
              <div className="users-empty-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                </svg>
              </div>
              <h3>Nenhum exame cadastrado</h3>
              <p>Clique em "+ Novo Exame" para adicionar ao catálogo.</p>
            </div>
          ) : (
            exams.map((exam) => (
              <div key={exam.id} className="user-row" style={{ gridTemplateColumns: '1fr 140px 200px 100px' }}>
                <div className="users-cell-user">
                  <div className="users-meta">
                    <p className="users-name">{exam.name}</p>
                  </div>
                </div>
                <div>
                  <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, fontWeight: 600, color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px' }}>
                    {exam.code}
                  </span>
                </div>
                <div>
                  <span className="users-badge-user">
                    {CATEGORY_LABEL[exam.category] ?? exam.category}
                  </span>
                </div>
                <div className="users-actions-cell">
                  <button
                    type="button"
                    className="users-btn-delete"
                    disabled={deletingId === exam.id}
                    onClick={() => handleDelete(exam.id, exam.name)}
                  >
                    {deletingId === exam.id ? 'Excluindo…' : 'Excluir'}
                  </button>
                </div>
              </div>
            ))
          )}

          <Pagination page={page} totalPages={totalPages} total={total} onPage={goToPage} />
        </div>
      </div>
    </>
  );
}
