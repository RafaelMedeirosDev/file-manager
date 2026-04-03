import { useLogin } from '../features/auth/hooks/useLogin';

// ─── Inline SVG icons ──────────────────────────────────────────────────────

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 4 7v5c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V7z" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// ─── Decorative background elements ───────────────────────────────────────

function DotGridPattern() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.18 }}
    >
      <defs>
        <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="#0078D4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  );
}

function AccentLines() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', bottom: 0, right: 0, width: '260px', height: '260px', opacity: 0.12 }}
      viewBox="0 0 260 260"
    >
      {[0, 28, 56, 84, 112, 140, 168, 196, 224].map((offset) => (
        <line
          key={offset}
          x1={260 - offset} y1="260"
          x2="260" y2={260 - offset}
          stroke="#0078D4" strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

// ─── Feature row ───────────────────────────────────────────────────────────

function FeatureRow({ icon, label, description }: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="lp-feature-row">
      <span className="lp-feature-icon">{icon}</span>
      <div>
        <p className="lp-feature-label">{label}</p>
        <p className="lp-feature-desc">{description}</p>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function LoginPage() {
  const { email, setEmail, password, setPassword, error, loading, handleSubmit } = useLogin();

  return (
    <>
      <style>{`
        @keyframes lp-slide-in {
          from { opacity: 0; transform: translateX(-32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes lp-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-feature-in {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes lp-ruler-grow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes lp-watermark-in {
          from { opacity: 0; }
          to   { opacity: 0.06; }
        }

        /* ── Wrapper ── */
        .lp-wrapper {
          display: flex;
          min-height: 100vh;
          background: #0d1e35;
          font-family: 'Manrope', 'Segoe UI', system-ui, sans-serif;
        }

        /* ── Left panel ── */
        .lp-left {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 60%;
          background-color: #0d1e35;
          overflow: hidden;
          padding: 56px 52px;
          animation: lp-slide-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .lp-left-top, .lp-left-bottom { position: relative; z-index: 1; }

        .lp-watermark {
          position: absolute;
          bottom: -40px;
          left: -16px;
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          font-size: 260px;
          line-height: 1;
          color: #0078D4;
          letter-spacing: -12px;
          user-select: none;
          pointer-events: none;
          opacity: 0;
          animation: lp-watermark-in 1s ease 0.3s forwards;
          z-index: 0;
        }

        .lp-brand-mark {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 40px;
        }
        .lp-brand-square {
          width: 32px;
          height: 32px;
          background: #0078D4;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .lp-brand-name {
          font-family: 'Manrope', sans-serif;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.55);
        }

        .lp-headline {
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          font-size: clamp(32px, 3.5vw, 52px);
          line-height: 1.08;
          letter-spacing: -0.03em;
          color: #ffffff;
          margin: 0 0 16px 0;
          max-width: 420px;
        }
        .lp-headline-accent { color: #0078D4; }

        .lp-tagline {
          font-family: 'Manrope', sans-serif;
          font-weight: 400;
          font-size: 15px;
          line-height: 1.6;
          color: rgba(255,255,255,0.45);
          margin: 0 0 52px 0;
          max-width: 360px;
        }

        .lp-ruler {
          width: 48px;
          height: 3px;
          background: #0078D4;
          margin-bottom: 32px;
          transform-origin: left;
          animation: lp-ruler-grow 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both;
        }

        .lp-features {
          display: flex;
          flex-direction: column;
          border-top: 1px solid rgba(255,255,255,0.07);
        }
        .lp-feature-row {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 18px 0;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .lp-feature-row:nth-child(1) { animation: lp-feature-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both; }
        .lp-feature-row:nth-child(2) { animation: lp-feature-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.62s both; }
        .lp-feature-row:nth-child(3) { animation: lp-feature-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.74s both; }

        .lp-feature-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          color: #0078D4;
          margin-top: 1px;
        }
        .lp-feature-label {
          font-family: 'Manrope', sans-serif;
          font-weight: 700;
          font-size: 13px;
          color: rgba(255,255,255,0.9);
          margin: 0 0 2px 0;
          letter-spacing: 0.01em;
        }
        .lp-feature-desc {
          font-family: 'Manrope', sans-serif;
          font-weight: 400;
          font-size: 12px;
          color: rgba(255,255,255,0.38);
          margin: 0;
          line-height: 1.5;
        }

        .lp-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 40px;
        }
        .lp-status-dot {
          width: 6px;
          height: 6px;
          background: #22c55e;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .lp-status-text {
          font-family: 'Manrope', sans-serif;
          font-weight: 500;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.28);
        }

        /* ── Right panel ── */
        .lp-right {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          width: 40%;
          background: #ffffff;
          padding: 56px 48px;
          animation: lp-fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
        }
        .lp-right::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: #0078D4;
        }

        .lp-form-wordmark {
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          font-size: 20px;
          letter-spacing: -0.03em;
          color: #0d1e35;
          margin: 0 0 8px 0;
        }
        .lp-form-tagline {
          font-family: 'Manrope', sans-serif;
          font-weight: 400;
          font-size: 13px;
          color: #94a3b8;
          margin: 0 0 40px 0;
        }
        .lp-field-section {
          font-family: 'Manrope', sans-serif;
          font-weight: 600;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 20px;
        }
        .lp-label {
          display: block;
          font-family: 'Manrope', sans-serif;
          font-weight: 600;
          font-size: 12px;
          letter-spacing: 0.04em;
          color: #475569;
          margin-bottom: 6px;
        }
        .lp-field-group {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 8px;
        }
        .lp-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #fff1f2;
          border-left: 3px solid #f43f5e;
          padding: 10px 12px;
          margin-top: 16px;
          font-family: 'Manrope', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #e11d48;
          line-height: 1.45;
        }
        .lp-footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .lp-footer-text {
          font-family: 'Manrope', sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: #cbd5e1;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .lp-footer-version {
          font-family: 'Manrope', sans-serif;
          font-size: 11px;
          color: #e2e8f0;
          font-variant-numeric: tabular-nums;
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .lp-wrapper { flex-direction: column; }
          .lp-left {
            width: 100%;
            padding: 32px 24px 28px;
            animation: lp-fade-up 0.45s ease both;
          }
          .lp-right {
            width: 100%;
            padding: 36px 24px 40px;
            min-height: 0;
          }
          .lp-watermark { font-size: 160px; bottom: -20px; left: -8px; }
          .lp-headline { font-size: 28px; margin-bottom: 10px; }
          .lp-tagline { margin-bottom: 28px; font-size: 14px; }
          .lp-features, .lp-ruler { display: none; }
          .lp-status { margin-top: 20px; }
          .lp-right::before { display: none; }
        }
      `}</style>

      <div className="lp-wrapper">

        {/* ── Left: Brand panel ── */}
        <div className="lp-left">
          <DotGridPattern />
          <AccentLines />
          <span className="lp-watermark" aria-hidden="true">FM</span>

          <div className="lp-left-top">
            <div className="lp-brand-mark">
              <div className="lp-brand-square" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7.8A1.8 1.8 0 0 1 4.8 6h5.2l1.6 2h7.4A1.8 1.8 0 0 1 21 9.8v7.4A1.8 1.8 0 0 1 19.2 19H4.8A1.8 1.8 0 0 1 3 17.2z" />
                </svg>
              </div>
              <span className="lp-brand-name">File Manager</span>
            </div>

            <h1 className="lp-headline">
              Seus arquivos.<br />
              Seu <span className="lp-headline-accent">controle.</span>
            </h1>
            <p className="lp-tagline">
              Gerencie documentos e pastas com segurança empresarial — de qualquer lugar.
            </p>

            <div className="lp-ruler" aria-hidden="true" />

            <div className="lp-features" role="list">
              <FeatureRow
                icon={<LayersIcon />}
                label="Hierarquia estruturada"
                description="Pastas aninhadas com controle granular de acesso por perfil."
              />
              <FeatureRow
                icon={<ShieldIcon />}
                label="Acesso protegido"
                description="Autenticação via token Bearer com papéis ADMIN e USER."
              />
              <FeatureRow
                icon={<ZapIcon />}
                label="Download instantâneo"
                description="Baixe qualquer arquivo diretamente pelo navegador, sem espera."
              />
            </div>
          </div>

          <div className="lp-left-bottom">
            <div className="lp-status" role="status" aria-label="Status do sistema">
              <span className="lp-status-dot" aria-hidden="true" />
              <span className="lp-status-text">Todos os sistemas operacionais</span>
            </div>
          </div>
        </div>

        {/* ── Right: Form panel ── */}
        <div className="lp-right">
          <p className="lp-form-wordmark">Bem-vindo</p>
          <p className="lp-form-tagline">Entre para acessar seu workspace.</p>

          <p className="lp-field-section">Credenciais de acesso</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="lp-field-group">
              <div>
                <label className="lp-label" htmlFor="email">Endereço de email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="app-input"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className="lp-label" htmlFor="password">Senha</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="app-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error ? (
              <div className="lp-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true"
                  style={{ flexShrink: 0, marginTop: '1px' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-6 w-full py-2.5"
              style={{ fontSize: '13px', letterSpacing: '0.04em' }}
            >
              {loading ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    aria-hidden="true"
                    style={{ marginRight: '8px', animation: 'lp-spin 0.7s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Entrando...
                </>
              ) : 'Entrar'}
            </button>
          </form>

          <div className="lp-footer" aria-hidden="true">
            <span className="lp-footer-text">File Manager</span>
            <span className="lp-footer-version">v1.0</span>
          </div>
        </div>

      </div>
    </>
  );
}
