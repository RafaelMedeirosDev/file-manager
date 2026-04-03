import { useNavigate } from 'react-router-dom';
import { useCreateUser } from '../features/users/hooks/useCreateUser';

// ── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function FolderSmallIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
    </svg>
  );
}

// ── Step track ───────────────────────────────────────────────────────────────

const STEPS = ['Identidade', 'Pastas', 'Revisão'] as const;

function StepTrack({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 36, userSelect: 'none' }}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const isCompleted = current > n;
        const isActive    = current === n;

        return (
          <div key={n} style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Circle + label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 80 }}>
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
                fontFamily: 'Manrope, sans-serif',
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#0d1e35' : isCompleted ? '#0078D4' : '#94a3b8',
                letterSpacing: '0.04em',
                textAlign: 'center',
              }}>
                {label}
              </span>
            </div>

            {/* Connector line (not after last) */}
            {i < STEPS.length - 1 && (
              <div style={{
                width: 80, height: 2, marginTop: 16, flexShrink: 0,
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

// ── Field label ──────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ display: 'block', fontFamily: 'Manrope, sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: '#475569', marginBottom: 6 }}
    >
      {children}
    </label>
  );
}

// ── Step 1: Identity ─────────────────────────────────────────────────────────

type Step1Props = {
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  confirmPassword: string; setConfirmPassword: (v: string) => void;
  step1Valid: boolean;
  passwordsMatch: boolean;
  passwordLongEnough: boolean;
  goNext: () => void;
  direction: 'forward' | 'back';
};

function Step1Identity({ name, setName, email, setEmail, password, setPassword, confirmPassword, setConfirmPassword, step1Valid, passwordsMatch, passwordLongEnough, goNext, direction }: Step1Props) {
  const showPasswordHint = confirmPassword.length > 0;

  return (
    <div className={direction === 'forward' ? 'wiz-enter-forward' : 'wiz-enter-back'}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: '#0d1e35', margin: '0 0 4px 0' }}>
          Dados de acesso
        </h2>
        <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#64748b', margin: '0 0 28px 0' }}>
          Defina o nome, email e senha do novo usuário.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <FieldLabel htmlFor="wiz-name">Nome completo</FieldLabel>
            <input id="wiz-name" type="text" className="app-input" value={name}
              onChange={(e) => setName(e.target.value)} placeholder="Ex: João Silva" required />
          </div>

          <div>
            <FieldLabel htmlFor="wiz-email">Endereço de email</FieldLabel>
            <input id="wiz-email" type="email" className="app-input" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="joao@empresa.com" required />
          </div>

          <div>
            <FieldLabel htmlFor="wiz-password">Senha</FieldLabel>
            <input id="wiz-password" type="password" className="app-input" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required />
            {password.length > 0 && !passwordLongEnough && (
              <p style={{ marginTop: 5, fontSize: 12, color: '#e11d48', fontFamily: 'Manrope, sans-serif' }}>
                A senha deve ter pelo menos 6 caracteres.
              </p>
            )}
          </div>

          <div>
            <FieldLabel htmlFor="wiz-confirm">Confirmar senha</FieldLabel>
            <input id="wiz-confirm" type="password" className="app-input" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" required />
            {showPasswordHint && (
              <p style={{ marginTop: 5, fontSize: 12, fontFamily: 'Manrope, sans-serif', color: passwordsMatch ? '#10b981' : '#e11d48', display: 'flex', alignItems: 'center', gap: 4 }}>
                {passwordsMatch ? '✓ Senhas coincidem' : '✗ Senhas não coincidem'}
              </p>
            )}
          </div>
        </div>

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-primary" onClick={goNext} disabled={!step1Valid}
            style={{ fontSize: 13, padding: '8px 20px' }}>
            Próximo →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Folders ──────────────────────────────────────────────────────────

type Step2Props = {
  folders: string[];
  folderInput: string;
  setFolderInput: (v: string) => void;
  addFolder: () => void;
  removeFolder: (i: number) => void;
  handleFolderKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  goNext: () => void;
  goBack: () => void;
  direction: 'forward' | 'back';
};

function Step2Folders({ folders, folderInput, setFolderInput, addFolder, removeFolder, handleFolderKeyDown, goNext, goBack, direction }: Step2Props) {
  return (
    <div className={direction === 'forward' ? 'wiz-enter-forward' : 'wiz-enter-back'}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: '#0d1e35', margin: '0 0 4px 0' }}>
          Pastas raiz
        </h2>
        <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#64748b', margin: '0 0 28px 0' }}>
          Crie as pastas iniciais para este usuário. Você pode pular esta etapa.
        </p>

        {/* Input row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            className="app-input"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            onKeyDown={handleFolderKeyDown}
            placeholder="Nome da pasta (Enter para adicionar)"
            style={{ flex: 1 }}
          />
          <button type="button" className="btn-secondary" onClick={addFolder}
            style={{ fontSize: 12, padding: '6px 14px', flexShrink: 0 }}>
            + Adicionar
          </button>
        </div>

        {/* Folder chips */}
        {folders.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 0' }}>
            {folders.map((name, i) => (
              <div key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fff', border: '1px solid #0078D4', borderRadius: 4,
                padding: '5px 10px', fontFamily: 'Manrope, sans-serif', fontSize: 13,
                fontWeight: 500, color: '#0d1e35',
              }}>
                <span style={{ color: '#f59e0b' }}><FolderSmallIcon /></span>
                <span>{name}</span>
                <button
                  type="button"
                  onClick={() => removeFolder(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 0 0 4px', lineHeight: 1, fontSize: 14, display: 'flex', alignItems: 'center' }}
                  aria-label={`Remover pasta ${name}`}
                >
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
            Nenhuma pasta adicionada — o usuário poderá criar pastas depois.
          </div>
        )}

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" className="btn-secondary" onClick={goBack} style={{ fontSize: 13, padding: '8px 20px' }}>
            ← Voltar
          </button>
          <button type="button" className="btn-primary" onClick={goNext} style={{ fontSize: 13, padding: '8px 20px' }}>
            Próximo →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Review ───────────────────────────────────────────────────────────

type Step3Props = {
  name: string; email: string; folders: string[];
  loading: boolean;
  submitError: string | null;
  goBack: () => void;
  handleSubmit: () => void;
  direction: 'forward' | 'back';
};

function Step3Review({ name, email, folders, loading, submitError, goBack, handleSubmit, direction }: Step3Props) {
  return (
    <div className={direction === 'forward' ? 'wiz-enter-forward' : 'wiz-enter-back'}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: '#0d1e35', margin: '0 0 4px 0' }}>
          Confirmar cadastro
        </h2>
        <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#64748b', margin: '0 0 24px 0' }}>
          Revise os dados antes de criar o usuário.
        </p>

        {/* Summary card */}
        <div style={{ background: '#fff', border: '1px solid var(--shell-border)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 16 }}>
          {/* User section */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 12px 0' }}>
              Usuário
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#64748b' }}>Nome</span>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 700, color: '#0d1e35' }}>{name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#64748b' }}>Email</span>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#334155' }}>{email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#64748b' }}>Perfil</span>
                <strong className="app-chip">USER</strong>
              </div>
            </div>
          </div>

          {/* Folders section */}
          <div style={{ padding: '16px 20px' }}>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 12px 0' }}>
              Pastas ({folders.length})
            </p>
            {folders.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {folders.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#334155' }}>
                    <span style={{ color: '#f59e0b' }}><FolderSmallIcon /></span>
                    {f}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#94a3b8', margin: 0 }}>
                Nenhuma pasta definida.
              </p>
            )}
          </div>
        </div>

        {/* Error alert */}
        {submitError && (
          <div style={{ display: 'flex', gap: 10, background: '#fff1f2', borderLeft: '3px solid #f43f5e', padding: '12px 14px', marginBottom: 16 }}>
            <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#e11d48', fontWeight: 500 }}>{submitError}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <button type="button" className="btn-secondary" onClick={goBack}
            disabled={loading}
            style={{ fontSize: 13, padding: '8px 20px' }}>
            ← Voltar
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit}
            disabled={loading}
            style={{ fontSize: 13, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {loading ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"
                  style={{ animation: 'lp-spin 0.7s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Criando...
              </>
            ) : 'Confirmar e Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function CreateUserPage() {
  const navigate = useNavigate();
  const wizard = useCreateUser();

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
          <h1 className="page-title">Novo Usuário</h1>
          <p className="page-subtitle">Configure identidade, pastas e confirme o cadastro.</p>
        </div>
        <button type="button" className="btn-secondary" style={{ fontSize: 12, flexShrink: 0 }}
          onClick={() => navigate('/users')}>
          ← Cancelar
        </button>
      </div>

      <div className="page-content">
        <StepTrack current={wizard.step} />

        {wizard.step === 1 && (
          <Step1Identity
            name={wizard.name}                   setName={wizard.setName}
            email={wizard.email}                 setEmail={wizard.setEmail}
            password={wizard.password}           setPassword={wizard.setPassword}
            confirmPassword={wizard.confirmPassword} setConfirmPassword={wizard.setConfirmPassword}
            step1Valid={wizard.step1Valid}
            passwordsMatch={wizard.passwordsMatch}
            passwordLongEnough={wizard.passwordLongEnough}
            goNext={wizard.goNext}
            direction={wizard.direction}
          />
        )}

        {wizard.step === 2 && (
          <Step2Folders
            folders={wizard.folders}
            folderInput={wizard.folderInput}     setFolderInput={wizard.setFolderInput}
            addFolder={wizard.addFolder}
            removeFolder={wizard.removeFolder}
            handleFolderKeyDown={wizard.handleFolderKeyDown}
            goNext={wizard.goNext}
            goBack={wizard.goBack}
            direction={wizard.direction}
          />
        )}

        {wizard.step === 3 && (
          <Step3Review
            name={wizard.name}
            email={wizard.email}
            folders={wizard.folders}
            loading={wizard.loading}
            submitError={wizard.submitError}
            goBack={wizard.goBack}
            handleSubmit={wizard.handleSubmit}
            direction={wizard.direction}
          />
        )}
      </div>
    </>
  );
}
