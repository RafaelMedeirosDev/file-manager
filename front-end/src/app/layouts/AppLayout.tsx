import { useEffect, useRef, useState, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useMatch } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { Sidebar } from '../../components/Sidebar';
import { SidebarProvider } from '../../features/folders/contexts/SidebarContext';
import { ChangePasswordModal } from '../../features/users/components/ChangePasswordModal';
import { useChangePassword } from '../../features/users/hooks/useChangePassword';

// ─── Topbar sub-components ─────────────────────────────────────────────────

function BrandMark({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        marginRight: 8,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          background: '#0078D4',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7.8A1.8 1.8 0 0 1 4.8 6h5.2l1.6 2h7.4A1.8 1.8 0 0 1 21 9.8v7.4A1.8 1.8 0 0 1 19.2 19H4.8A1.8 1.8 0 0 1 3 17.2z" />
        </svg>
      </div>
      <span
        style={{
          fontFamily: 'Manrope, sans-serif',
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '-0.01em',
          color: '#0d1e35',
          whiteSpace: 'nowrap',
        }}
      >
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

// ── Dropdown styles (shared) ───────────────────────────────────────────────

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

/* ── User account dropdown ── */

.user-dropdown-wrap { position: relative; }

.user-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 8px;
  transition: background 0.12s;
}

.user-dropdown-trigger:hover { background: rgba(13, 30, 53, 0.06); }

.user-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 100;
  background: #ffffff;
  border: 1px solid #e0e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(13, 30, 53, 0.12), 0 2px 6px rgba(13, 30, 53, 0.06);
  min-width: 220px;
  overflow: hidden;
  animation: nav-drop-in 0.18s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.user-dropdown-header {
  padding: 14px 16px 12px;
  border-bottom: 1px solid #f1f5f9;
}

.user-dropdown-name {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #0d1e35;
  margin: 0 0 3px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-dropdown-email {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: #94a3b8;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #0d1e35;
  background: none;
  border: none;
  border-bottom: 1px solid #f4f7fa;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s, color 0.12s;
}

.user-dropdown-item:last-child { border-bottom: none; }

.user-dropdown-item:hover { background: #f0f7fe; color: #0078D4; }

.user-dropdown-item.danger:hover { background: #fff1f2; color: #e11d48; }

.user-dropdown-item-icon {
  width: 28px; height: 28px;
  border-radius: 7px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.12s;
}

.user-dropdown-item:hover .user-dropdown-item-icon { background: #dbeafe; }
.user-dropdown-item.danger:hover .user-dropdown-item-icon { background: #ffe4e6; }
`;

// ── Solicitações dropdown ──────────────────────────────────────────────────

function SolicitacoesDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const matchList = useMatch('/exam-requests');
  const matchNew = useMatch('/exam-requests/new');
  const matchExams = useMatch('/exams');
  const isActive = !!(matchList || matchNew || matchExams);

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
    <div className="nav-dropdown-wrap" ref={ref}>
      <button
        type="button"
        className={`nav-dropdown-trigger${isActive ? ' active' : ''}${open ? ' open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Solicitações
        <svg
          className="nav-dropdown-chevron"
          width="10"
          height="7"
          viewBox="0 0 10 7"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="nav-dropdown-menu" role="menu">
          <NavLink
            to="/exam-requests/new"
            role="menuitem"
            className={({ isActive: a }) =>
              `nav-dropdown-item${a ? ' active' : ''}`
            }
            onClick={() => setOpen(false)}
          >
            <span className="nav-dropdown-item-icon">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            Nova Solicitação
          </NavLink>

          <NavLink
            to="/exam-requests"
            end
            role="menuitem"
            className={({ isActive: a }) =>
              `nav-dropdown-item${a ? ' active' : ''}`
            }
            onClick={() => setOpen(false)}
          >
            <span className="nav-dropdown-item-icon">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <line x1="9" y1="12" x2="15" y2="12" />
                <line x1="9" y1="16" x2="13" y2="16" />
              </svg>
            </span>
            Solicitações
          </NavLink>

          <NavLink
            to="/exams"
            end
            role="menuitem"
            className={({ isActive: a }) =>
              `nav-dropdown-item${a ? ' active' : ''}`
            }
            onClick={() => setOpen(false)}
          >
            <span className="nav-dropdown-item-icon">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 12h2m0 0h2m-2 0v2m0-2V10" />
              </svg>
            </span>
            Catálogo de Exames
          </NavLink>
        </div>
      )}
    </div>
  );
}

// ── User account dropdown ──────────────────────────────────────────────────

type UserAccountDropdownProps = {
  name: string;
  email: string;
  role: string;
  onChangePassword: () => void;
  onLogout: () => void;
};

function UserAccountDropdown({
  name,
  email,
  role,
  onChangePassword,
  onLogout,
}: UserAccountDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    <div className="user-dropdown-wrap" ref={ref}>
      <button
        type="button"
        className="user-dropdown-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div
          className="topbar-user-text"
          style={{ textAlign: 'right', lineHeight: 1 }}
        >
          <p
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              color: '#0d1e35',
              margin: 0,
            }}
          >
            {name}
          </p>
          <p
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: 11,
              color: '#94a3b8',
              margin: '3px 0 0 0',
            }}
          >
            {email}
          </p>
        </div>
        <span className="topbar-user-text app-chip">{role}</span>
        <svg
          width="10"
          height="7"
          viewBox="0 0 10 7"
          fill="none"
          aria-hidden="true"
          style={{
            flexShrink: 0,
            color: '#94a3b8',
            transition: 'transform 0.18s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="user-dropdown-menu" role="menu">
          <div className="user-dropdown-header">
            <p className="user-dropdown-name">{name}</p>
            <p className="user-dropdown-email">{email}</p>
          </div>

          <button
            type="button"
            className="user-dropdown-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onChangePassword();
            }}
          >
            <span className="user-dropdown-item-icon">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            Minha senha
          </button>

          <button
            type="button"
            className="user-dropdown-item danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <span className="user-dropdown-item-icon">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────────

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const changePassword = useChangePassword();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleOpenPasswordModal() {
    changePassword.reset();
    setPasswordModalOpen(true);
  }

  function handleClosePasswordModal() {
    setPasswordModalOpen(false);
    changePassword.reset();
  }

  return (
    <SidebarProvider>
      <style>{DROPDOWN_STYLES}</style>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          background: 'var(--shell-content)',
        }}
      >
        {/* ── Topbar ── */}
        <header
          style={{
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
          }}
        >
          {/* Hamburguer — visível só em mobile via CSS */}
          <button
            type="button"
            className="sb-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <BrandMark onClick={() => navigate('/')} />

          <nav className="topbar-nav">
            {user?.role === 'ADMIN' && (
              <>
                <TopNavLink to="/users" label="Usuários" />
                <TopNavLink to="/folders" label="Pastas" />
                <SolicitacoesDropdown />
              </>
            )}
            {user?.role === 'USER' && (
              <TopNavLink to="/folders" label="Pastas" />
            )}
          </nav>

          <div style={{ flex: 1 }} />

          {/* User account dropdown */}
          {user && (
            <UserAccountDropdown
              name={user.name}
              email={user.email}
              role={user.role}
              onChangePassword={handleOpenPasswordModal}
              onLogout={handleLogout}
            />
          )}
        </header>

        {/* ── Backdrop mobile ── */}
        <div
          className={`sb-backdrop${sidebarOpen ? ' open' : ''}`}
          onClick={closeSidebar}
          aria-hidden="true"
        />

        {/* ── Body ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
          <main style={{ flex: 1, overflow: 'auto' }}>
            <Outlet />
          </main>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={handleClosePasswordModal}
        currentPassword={changePassword.currentPassword}
        onCurrentPasswordChange={changePassword.setCurrentPassword}
        newPassword={changePassword.newPassword}
        onNewPasswordChange={changePassword.setNewPassword}
        confirmNewPassword={changePassword.confirmNewPassword}
        onConfirmNewPasswordChange={changePassword.setConfirmNewPassword}
        onSubmit={changePassword.handleSubmit}
        isSubmitting={changePassword.isSubmitting}
        error={changePassword.error}
        success={changePassword.success}
      />
    </SidebarProvider>
  );
}
