import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Sidebar } from '../../components/Sidebar';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1 text-[13px] font-medium transition-colors duration-100 ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/[0.07] hover:text-slate-200'
  }`;

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">

      {/* ── Navbar ────────────────────────────────────── */}
      <header className="flex h-11 flex-shrink-0 items-center gap-1 border-b border-black/20 bg-[#1f1f1f] px-4">

        <Link to="/" className="mr-3 text-[14px] font-semibold tracking-tight text-white">
          File Manager
        </Link>

        {/* Nav links — condicionais por role */}
        {user?.role === 'ADMIN' && (
          <>
            <NavLink to="/users" className={navLinkClass}>Usuários</NavLink>
            <NavLink to="/folders" className={navLinkClass}>Pastas</NavLink>
          </>
        )}
        {user?.role === 'USER' && (
          <NavLink to="/folders" className={navLinkClass}>Pastas</NavLink>
        )}

        {/* Lado direito: info do usuário + Sair */}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end leading-none">
            <span className="text-[13px] font-medium text-slate-200">{user?.name}</span>
            <span className="mt-0.5 text-[11px] text-slate-500">{user?.email}</span>
          </div>
          <span className="app-chip-dark">{user?.role}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded px-3 py-1 text-[13px] font-medium text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
          >
            Sair
          </button>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <Sidebar />

        {/* Área de conteúdo */}
        <main className="flex flex-1 flex-col overflow-auto bg-white">
          <div className="flex-1 p-5">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}
