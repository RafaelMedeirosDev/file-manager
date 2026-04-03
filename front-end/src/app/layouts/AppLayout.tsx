import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
                <TopNavLink to="/files"   label="Arquivos" />
              </>
            )}
            {user?.role === 'USER' && (
              <>
                <TopNavLink to="/folders" label="Pastas"   />
                <TopNavLink to="/files"   label="Arquivos" />
              </>
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
