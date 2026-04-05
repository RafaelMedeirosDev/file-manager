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

// ── Step indicator ────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['Definir pastas', 'Selecionar usuários', 'Revisão'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const isActive = n === current;
        const isDone = n < current;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < 3 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontFamily: 'Manrope, sans-serif', fontWeight: 700,
                background: isDone ? '#0078D4' : isActive ? '#0078D4' : '#e2e8f0',
                color: isActive || isDone ? '#fff' : '#94a3b8',
              }}>
                {isDone ? '✓' : n}
              </div>
              <span style={{
                fontFamily: 'Manrope, sans-serif', fontSize: 13,
                fontWeight: isActive ? 700 : 400,
                color: isActive ? '#0d1e35' : isDone ? '#0078D4' : '#94a3b8',
              }}>
                {label}
              </span>
            </div>
            {n < 3 && (
              <div style={{ flex: 1, height: 1, background: isDone ? '#0078D4' : '#e2e8f0', margin: '0 12px' }} />
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
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Criar pastas em lote</h1>
          <p className="page-subtitle">Crie múltiplas pastas para vários usuários de uma vez.</p>
        </div>
        <button type="button" className="btn-secondary" style={{ fontSize: 12, flexShrink: 0 }}
          onClick={() => navigate('/folders')}>
          ← Voltar
        </button>
      </div>

      <div className="page-content">
        <div style={{ maxWidth: 700 }}>

          <StepIndicator current={step} />

          {/* ── ETAPA 1: Definir pastas ── */}
          {step === 1 && (
            <div className="app-card" style={{ padding: 24 }}>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 16px 0' }}>
                Pastas a criar
              </p>

              {/* Input */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8 }}>
                <input
                  className="app-input"
                  placeholder="Nome da pasta"
                  value={folderInput}
                  onChange={(e) => setFolderInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFolder(); } }}
                />
                <button type="button" className="btn-primary" style={{ fontSize: 12 }} onClick={addFolder}>
                  + Adicionar
                </button>
              </div>
              {folderInputError ? (
                <p style={{ fontSize: 12, color: '#e11d48', fontFamily: 'Manrope, sans-serif', margin: '0 0 12px 0' }}>
                  {folderInputError}
                </p>
              ) : null}

              {/* Lista */}
              {folderNames.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {folderNames.map((name) => (
                    <li key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', border: '1px solid var(--shell-border)', borderRadius: 6 }}>
                      <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#0d1e35', fontWeight: 500 }}>
                        📁 {name}
                      </span>
                      <button type="button" onClick={() => removeFolder(name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e11d48', fontSize: 12, fontFamily: 'Manrope, sans-serif', fontWeight: 600, padding: '2px 6px' }}>
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope, sans-serif', marginTop: 16 }}>
                  Nenhuma pasta adicionada ainda.
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                <button type="button" className="btn-primary" style={{ fontSize: 12 }}
                  disabled={folderNames.length === 0}
                  onClick={() => void nextStep()}>
                  Próximo →
                </button>
              </div>
            </div>
          )}

          {/* ── ETAPA 2: Selecionar usuários ── */}
          {step === 2 && (
            <div className="app-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', margin: 0 }}>
                  Usuários
                </p>
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
                        {isSelected && (
                          <span style={{ fontSize: 11, color: '#0078D4' }}>✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={prevStep}>
                  ← Voltar
                </button>
                <button type="button" className="btn-primary" style={{ fontSize: 12 }}
                  disabled={selectedUserIds.size === 0}
                  onClick={() => void nextStep()}>
                  Próximo →
                </button>
              </div>
            </div>
          )}

          {/* ── ETAPA 3: Revisão e confirmação ── */}
          {step === 3 && (
            <div className="app-card" style={{ padding: 24 }}>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 16px 0' }}>
                Revisão — {combinations.length} combinação{combinations.length !== 1 ? 'ões' : ''}
                {' · '}
                <span style={{ color: '#e11d48' }}>{combinations.filter((c) => c.conflict).length} conflito{combinations.filter((c) => c.conflict).length !== 1 ? 's' : ''}</span>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', padding: '6px 12px', background: '#f8fafc', border: '1px solid var(--shell-border)', borderRadius: '6px 6px 0 0' }}>
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
                      padding: '10px 12px', alignItems: 'center',
                      background: c.conflict ? '#fff5f5' : '#ffffff',
                      border: `1px solid ${c.conflict ? '#fecdd3' : 'var(--shell-border)'}`,
                      borderRadius: 6,
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

              {!hasResults && combinations.filter((c) => c.conflict).length > 0 && (
                <p style={{ fontSize: 12, color: '#e11d48', fontFamily: 'Manrope, sans-serif', marginTop: 12 }}>
                  Combinações em vermelho já existem e serão ignoradas.
                  {validCombinations.length === 0 ? ' Todas as combinações têm conflito — não há nada para criar.' : ''}
                </p>
              )}

              {hasResults && (
                <p style={{ fontSize: 13, fontFamily: 'Manrope, sans-serif', marginTop: 12, color: '#0d1e35' }}>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{creationResults.filter((r) => r.status === 'fulfilled').length} criadas</span>
                  {' · '}
                  <span style={{ color: '#e11d48', fontWeight: 600 }}>{creationResults.filter((r) => r.status === 'rejected').length} erros</span>
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button type="button" className="btn-secondary" style={{ fontSize: 12 }}
                  onClick={prevStep} disabled={confirming}>
                  ← Voltar
                </button>
                {!hasResults && (
                  <button type="button" className="btn-primary" style={{ fontSize: 12 }}
                    disabled={confirming || validCombinations.length === 0}
                    onClick={() => void confirm()}>
                    {confirming ? 'Criando...' : `Confirmar (${validCombinations.length})`}
                  </button>
                )}
                {hasResults && (
                  <button type="button" className="btn-secondary" style={{ fontSize: 12 }}
                    onClick={() => navigate('/folders')}>
                    Ir para pastas
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
