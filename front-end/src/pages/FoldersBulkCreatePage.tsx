import { useNavigate } from 'react-router-dom';
import { useBulkFolderCreation } from '../features/folders/hooks/useBulkFolderCreation';

// ── Avatar helpers ────────────────────────────────────────

const AV_CLASSES = ['av-blue', 'av-indigo', 'av-violet', 'av-green', 'av-amber', 'av-rose', 'av-teal', 'av-orange'];

function avatarClass(name: string): string {
  return AV_CLASSES[name.charCodeAt(0) % 8];
}

function avatarInitials(name: string): string {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

// ── Check icon ────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Step track ────────────────────────────────────────────

const STEPS = ['Definir pastas', 'Selecionar usuários', 'Revisão'] as const;

function StepTrack({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 36, userSelect: 'none' }}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const isCompleted = current > n;
        const isActive = current === n;

        return (
          <div key={n} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 100 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: isCompleted || isActive ? '#0078D4' : '#f0f4f8',
                border: `2px solid ${isCompleted || isActive ? '#0078D4' : '#cbd5e1'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isCompleted || isActive ? '#fff' : '#94a3b8',
                fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 13,
                transition: 'background 0.25s, border-color 0.25s',
                flexShrink: 0,
              }}>
                {isCompleted ? <CheckIcon /> : n}
              </div>
              <span style={{
                fontFamily: 'Manrope, sans-serif', fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#0d1e35' : isCompleted ? '#0078D4' : '#94a3b8',
                letterSpacing: '0.04em', textAlign: 'center',
              }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 60, height: 2, marginTop: 16, flexShrink: 0,
                background: isCompleted ? '#0078D4' : '#e2e8f0',
                transition: 'background 0.25s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────

export function FoldersBulkCreatePage() {
  const navigate = useNavigate();
  const {
    step, nextStep, prevStep,
    folderNames, folderInput, setFolderInput, addFolder, removeFolder, folderInputError,
    usersOptions, selectedUserIds, toggleUser, selectAllUsers, loadingUsers, loadError,
    combinations, creationResults, confirming, confirm,
  } = useBulkFolderCreation();

  const allSelected = usersOptions.length > 0 && usersOptions.every((u) => selectedUserIds.has(u.id));
  const validCombinations = combinations.filter((c) => !c.conflict);
  const hasResults = creationResults.length > 0;
  const usersById = new Map(usersOptions.map((u) => [u.id, u.name]));

  return (
    <>
      <style>{`
        @keyframes wiz-slide-in-right {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes wiz-slide-in-left {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .wiz-enter-forward { animation: wiz-slide-in-right 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .wiz-enter-back    { animation: wiz-slide-in-left  0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Criar pastas em lote</h1>
          <p className="page-subtitle">Crie múltiplas pastas para vários usuários de uma vez.</p>
        </div>
        <button type="button" className="btn-secondary" style={{ fontSize: 12, flexShrink: 0 }}
          onClick={() => navigate('/folders')}>
          ← Cancelar
        </button>
      </div>

      <div className="page-content">
        <StepTrack current={step} />

        {/* ── ETAPA 1: Definir pastas ── */}
        {step === 1 && (
          <div className="wiz-enter-forward">
            <div style={{ maxWidth: 480, margin: '0 auto' }}>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: '#0d1e35', margin: '0 0 4px 0' }}>
                Pastas a criar
              </h2>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#64748b', margin: '0 0 28px 0' }}>
                Adicione os nomes das pastas que serão criadas para cada usuário selecionado.
              </p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className="app-input"
                  placeholder="Nome da pasta (Enter para adicionar)"
                  value={folderInput}
                  onChange={(e) => setFolderInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFolder(); } }}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px', flexShrink: 0 }} onClick={addFolder}>
                  + Adicionar
                </button>
              </div>

              {folderInputError ? (
                <p style={{ fontSize: 12, color: '#e11d48', fontFamily: 'Manrope, sans-serif', margin: '0 0 12px 0' }}>
                  {folderInputError}
                </p>
              ) : null}

              {folderNames.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 0' }}>
                  {folderNames.map((name) => (
                    <div key={name} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: '#fff', border: '1px solid #0078D4', borderRadius: 4,
                      padding: '5px 10px', fontFamily: 'Manrope, sans-serif', fontSize: 13,
                      fontWeight: 500, color: '#0d1e35',
                    }}>
                      <span style={{ fontSize: 12 }}>📁</span>
                      <span>{name}</span>
                      <button type="button" onClick={() => removeFolder(name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 0 0 4px', lineHeight: 1, fontSize: 14, display: 'flex', alignItems: 'center' }}
                        aria-label={`Remover pasta ${name}`}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  border: '1px dashed #cbd5e1', borderRadius: 8, padding: '20px 16px',
                  textAlign: 'center', fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#94a3b8',
                }}>
                  Nenhuma pasta adicionada ainda.
                </div>
              )}

              <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}
                  disabled={folderNames.length === 0}
                  onClick={() => void nextStep()}>
                  Próximo →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ETAPA 2: Selecionar usuários ── */}
        {step === 2 && (
          <div className="wiz-enter-forward">
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: '#0d1e35', margin: '0 0 4px 0' }}>
                Selecionar usuários
              </h2>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#64748b', margin: '0 0 28px 0' }}>
                As pastas serão criadas para cada usuário selecionado.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                {usersOptions.length > 0 && (
                  <button type="button" className="btn-secondary" style={{ fontSize: 11 }} onClick={selectAllUsers}>
                    {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                )}
              </div>

              {loadError ? (
                <p style={{ fontSize: 13, color: '#e11d48', fontFamily: 'Manrope, sans-serif' }}>{loadError}</p>
              ) : loadingUsers ? (
                <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope, sans-serif' }}>Carregando usuários...</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {usersOptions.map((u) => {
                    const isSelected = selectedUserIds.has(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUser(u.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          border: `1.5px solid ${isSelected ? '#0078D4' : 'var(--shell-border)'}`,
                          borderRadius: 10, cursor: 'pointer',
                          transition: 'border-color 0.12s, background 0.12s, box-shadow 0.12s',
                          boxShadow: isSelected ? '0 0 0 3px rgba(0,120,212,0.10)' : '0 1px 3px rgba(0,0,0,0.05)',
                          fontFamily: 'Manrope, sans-serif',
                        }}
                      >
                        <div className={`users-avatar ${avatarClass(u.name)}`} style={{ width: 32, height: 32, fontSize: 12 }}>
                          {avatarInitials(u.name)}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#0078D4' : '#0d1e35', whiteSpace: 'nowrap' }}>
                          {u.name}
                        </span>
                        {isSelected && <span style={{ fontSize: 11, color: '#0078D4' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="btn-secondary" style={{ fontSize: 13, padding: '8px 20px' }} onClick={prevStep}>
                  ← Voltar
                </button>
                <button type="button" className="btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}
                  disabled={selectedUserIds.size === 0}
                  onClick={() => void nextStep()}>
                  Próximo →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ETAPA 3: Revisão e confirmação ── */}
        {step === 3 && (
          <div className="wiz-enter-forward">
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: '#0d1e35', margin: '0 0 4px 0' }}>
                Confirmar criação
              </h2>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#64748b', margin: '0 0 24px 0' }}>
                {combinations.filter((c) => c.conflict).length > 0
                  ? `${combinations.filter((c) => c.conflict).length} combinação(ões) já existem e serão ignoradas.`
                  : `${combinations.length} pasta(s) serão criadas.`}
              </p>

              <div style={{ background: '#fff', border: '1px solid var(--shell-border)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 16 }}>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid var(--shell-border)' }}>
                  <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8' }}>Pasta</span>
                  <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8' }}>Usuário</span>
                  <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8' }}>Status</span>
                </div>

                {combinations.map((c, i) => {
                  const result = creationResults.find((r) => r.folderName === c.folderName && r.userId === c.userId);
                  const userName = usersById.get(c.userId) ?? c.userId;
                  return (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr auto',
                      padding: '10px 16px', alignItems: 'center',
                      background: c.conflict ? '#fff5f5' : '#ffffff',
                      borderBottom: i < combinations.length - 1 ? '1px solid #f1f5f9' : 'none',
                    }}>
                      <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: c.conflict ? '#be123c' : '#0d1e35', fontWeight: 500 }}>
                        📁 {c.folderName}
                      </span>
                      <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: c.conflict ? '#be123c' : '#334155' }}>
                        {userName}
                      </span>
                      <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {result ? (
                          result.status === 'fulfilled'
                            ? <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Criada</span>
                            : <span style={{ color: '#e11d48', fontWeight: 600 }} title={result.error}>✗ Erro</span>
                        ) : c.conflict ? (
                          <span style={{ color: '#e11d48' }}>Já existe</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Pendente</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {hasResults && (
                <p style={{ fontSize: 13, fontFamily: 'Manrope, sans-serif', marginBottom: 16, color: '#0d1e35' }}>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{creationResults.filter((r) => r.status === 'fulfilled').length} criadas com sucesso</span>
                  {creationResults.filter((r) => r.status === 'rejected').length > 0 && (
                    <> · <span style={{ color: '#e11d48', fontWeight: 600 }}>{creationResults.filter((r) => r.status === 'rejected').length} com erro</span></>
                  )}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="btn-secondary" style={{ fontSize: 13, padding: '8px 20px' }}
                  onClick={prevStep} disabled={confirming}>
                  ← Voltar
                </button>
                {!hasResults ? (
                  <button type="button" className="btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}
                    disabled={confirming || validCombinations.length === 0}
                    onClick={() => void confirm()}>
                    {confirming ? 'Criando...' : `Confirmar (${validCombinations.length})`}
                  </button>
                ) : (
                  <button type="button" className="btn-secondary" style={{ fontSize: 13, padding: '8px 20px' }}
                    onClick={() => navigate('/folders')}>
                    Ir para pastas
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
