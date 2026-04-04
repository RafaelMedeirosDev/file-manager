import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, useMatch } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { Sidebar } from '../../components/Sidebar';
import { SidebarProvider } from '../../features/folders/contexts/SidebarContext';

// ─── Topbar sub-components ─────────────────────────────────────────────────

function BrandMark({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginRight: 8,
      }}
    >
      <div style={{
        width: 28, height: 28, background: '#0078D4', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7.8A1.8 1.8 0 0 1 4.8 6h5.2l1.6 2h7.4A1.8 1.8 0 0 1 21 9.8v7.4A1.8 1.8 0 0 1 19.2 19H4.8A1.8 1.8 0 0 1 3 17.2z" />
        </svg>
      </div>
      <span style={{
        fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 14,
        letterSpacing: '-0.01em', color: '#0d1e35',
      }}>
        File Manager
      </span>
    </button>
  );
}

function TopNavLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        fontFamily: 'Manrope, sans-serif',
        fontSize: 13,
        fontWeight: isActive ? 600 : 500,
        color: isActive ? '#0d1e35' : '#94a3b8',
        textDecoration: 'none',
        padding: '6px 12px',
        borderBottom: isActive ? '2px solid #0078D4' : '2px solid transparent',
        transition: 'color 0.12s',
      })}
    >
      {label}
    </NavLink>
  );
}

// ── Solicitações dropdown ──────────────────────────────────────────────────

const DROPDOWN_STYLES = `
@keyframes nav-drop-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}

.nav-dropdown-wrap { position: relative; }

.nav-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  fontFamily: Manrope, sans-serif;
  font-size: 13px;
  font-weight: 500;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 6px 12px;
  cursor: pointer;
  color: #94a3b8;
  transition: color 0.12s;
  line-height: 1;
  height: 56px;
}

.nav-dropdown-trigger:hover { color: #0d1e35; }

.nav-dropdown-trigger.active {
  color: #0d1e35;
  font-weight: 600;
  border-bottom-color: #0078D4;
}

.nav-dropdown-chevron {
  transition: transform 0.18s;
  color: currentColor;
}

.nav-dropdown-trigger.open .nav-dropdown-chevron {
  transform: rotate(180deg);
}

.nav-dropdown-menu {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  z-index: 100;
  background: #ffffff;
  border: 1px solid #e0e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(13, 30, 53, 0.12), 0 2px 6px rgba(13, 30, 53, 0.06);
  min-width: 196px;
  overflow: hidden;
  animation: nav-drop-in 0.18s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.nav-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #0d1e35;
  text-decoration: none;
  transition: background 0.12s, color 0.12s;
  border-bottom: 1px solid #f4f7fa;
}

.nav-dropdown-item:last-child { border-bottom: none; }

.nav-dropdown-item:hover {
  background: #f0f7fe;
  color: #0078D4;
}

.nav-dropdown-item.active {
  background: #f0f7fe;
  color: #0078D4;
  font-weight: 600;
}

.nav-dropdown-item-icon {
  width: 28px; height: 28px;
  border-radius: 7px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.12s;
}

.nav-dropdown-item:hover .nav-dropdown-item-icon,
.nav-dropdown-item.active .nav-dropdown-item-icon {
  background: #dbeafe;
}
`;

function SolicitacoesDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const matchList = useMatch('/exam-requests');
  const matchNew  = useMatch('/exam-requests/new');
  const isActive  = !!(matchList || matchNew);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <>
      <style>{DROPDOWN_STYLES}</style>
      <div className="nav-dropdown-wrap" ref={ref}>
        <button
          type="button"
          className={`nav-dropdown-trigger${isActive ? ' active' : ''}${open ? ' open' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          Solicitações
          <svg className="nav-dropdown-chevron" width="10" height="7" viewBox="0 0 10 7"
            fill="none" aria-hidden="true">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div className="nav-dropdown-menu" role="menu">
            <NavLink
              to="/exam-requests/new"
              role="menuitem"
              className={({ isActive: a }) => `nav-dropdown-item${a ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="nav-dropdown-item-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              Nova Solicitação
            </NavLink>

            <NavLink
              to="/exam-requests"
              end
              role="menuitem"
              className={({ isActive: a }) => `nav-dropdown-item${a ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="nav-dropdown-item-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <line x1="9" y1="12" x2="15" y2="12" />
                  <line x1="9" y1="16" x2="13" y2="16" />
                </svg>
              </span>
              Solicitações
            </NavLink>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────────

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <SidebarProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--shell-content)' }}>

        {/* ── Topbar ── */}
        <header style={{
          height: 56,
          background: 'var(--shell-topbar)',
          borderBottom: '1px solid var(--shell-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 4,
          position: 'sticky',
          top: 0,
          zIndex: 20,
          flexShrink: 0,
        }}>
          <BrandMark onClick={() => navigate('/')} />

          <nav style={{ display: 'flex', alignItems: 'center' }}>
            {user?.role === 'ADMIN' && (
              <>
                <TopNavLink to="/users"   label="Usuários" />
                <TopNavLink to="/folders" label="Pastas"   />
                <SolicitacoesDropdown />
              </>
            )}
            {user?.role === 'USER' && (
              <TopNavLink to="/folders" label="Pastas" />
            )}
          </nav>

          <div style={{ flex: 1 }} />

          {/* User chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right', lineHeight: 1 }}>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 600, color: '#0d1e35', margin: 0 }}>
                {user?.name}
              </p>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: '#94a3b8', margin: '3px 0 0 0' }}>
                {user?.email}
              </p>
            </div>
            <span className="app-chip">{user?.role}</span>
            <button type="button" onClick={handleLogout} className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}>
              Sair
            </button>
          </div>
        </header>

        {/* ── Body ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />
          <main style={{ flex: 1, overflow: 'auto' }}>
            <Outlet />
          </main>
        </div>

      </div>
    </SidebarProvider>
  );
}
