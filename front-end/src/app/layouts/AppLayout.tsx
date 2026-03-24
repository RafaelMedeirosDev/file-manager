import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          File Manager
        </Link>

        <nav className="nav-list">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/folders">Pastas</NavLink>
          <NavLink to="/files">Arquivos</NavLink>
          {user?.role === 'ADMIN' ? <NavLink to="/users">Usuarios</NavLink> : null}
        </nav>

        <button type="button" className="logout-btn" onClick={logout}>
          Sair
        </button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <strong>{user?.name}</strong>
            <p>{user?.email}</p>
          </div>
          <span className="role-badge">{user?.role}</span>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
