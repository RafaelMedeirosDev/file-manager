import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
    isActive
      ? 'bg-white text-slate-900 shadow-sm'
      : 'text-slate-300 hover:bg-white/10 hover:text-white'
  }`;
}

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-slate-800/40 bg-[linear-gradient(180deg,#0f172a_0%,#152545_100%)] p-4 text-slate-100 lg:min-h-screen lg:border-b-0 lg:border-r lg:border-slate-800/60 lg:flex lg:flex-col">
        <div className="mb-6">
          <Link to="/" className="text-2xl font-extrabold tracking-tight text-white">
            File Manager
          </Link>
        </div>

        <nav className="mb-6 flex flex-wrap gap-2 lg:flex-col">
          {user?.role === 'ADMIN' ? (
            <NavLink to="/users" className={navLinkClass}>
              Usuarios
            </NavLink>
          ) : null}
          <NavLink to="/folders" className={navLinkClass}>
            Pastas
          </NavLink>
          <NavLink to="/files" className={navLinkClass}>
            Arquivos
          </NavLink>
        </nav>

        <button type="button" className="btn-primary w-full bg-rose-500 hover:bg-rose-600 lg:mt-auto" onClick={logout}>
          Sair
        </button>
      </aside>

      <main className="p-4 lg:p-6">
        <header className="app-card mb-4 border-brand-100/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-bold text-slate-900">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
            <span className="app-chip">{user?.role}</span>
          </div>
        </header>

        <section className="app-card p-4 lg:p-5">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
