import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded-xl px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-brand-500/20 text-white ring-1 ring-brand-100/60'
      : 'text-slate-300 hover:bg-white/10 hover:text-white'
  }`;
}

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#dbeafe_0%,_#f8fafc_42%,_#ffffff_100%)] lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-slate-200 bg-slate-900/95 p-4 text-slate-100 lg:min-h-screen lg:border-b-0 lg:border-r lg:border-slate-800">
        <div className="mb-6">
          <Link to="/" className="text-xl font-extrabold tracking-tight text-white">
            File Manager
          </Link>
        </div>

        <nav className="mb-6 flex flex-wrap gap-2 lg:flex-col">
          <NavLink to="/" end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/folders" className={navLinkClass}>
            Pastas
          </NavLink>
          <NavLink to="/files" className={navLinkClass}>
            Arquivos
          </NavLink>
          {user?.role === 'ADMIN' ? (
            <NavLink to="/users" className={navLinkClass}>
              Usuarios
            </NavLink>
          ) : null}
        </nav>

        <button type="button" className="btn-primary w-full bg-rose-500 hover:bg-rose-600 lg:mt-8" onClick={logout}>
          Sair
        </button>
      </aside>

      <main className="p-4 lg:p-6">
        <header className="app-card mb-4 border-brand-100/70 bg-white/90 p-4 backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-bold text-slate-900">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700">
              {user?.role}
            </span>
          </div>
        </header>

        <section className="app-card p-4 lg:p-5">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
