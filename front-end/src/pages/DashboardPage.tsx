import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Bem-vindo, {user?.name}. Visão geral do workspace.</p>
        </div>
      </div>

      <div className="page-content">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: 24 }}>
          <div className="metric-card">
            <p className="metric-label">Perfil</p>
            <p className="metric-value sm">{user?.role}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Permissão</p>
            <p className="metric-value sm">Acesso ativo</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Ambiente</p>
            <p className="metric-value sm">Produção local</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Workspace</p>
            <p className="metric-value sm">File Manager</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          <Link to="/folders" className="nav-card">
            <p className="nav-card-section">Navegação</p>
            <p className="nav-card-title">Pastas</p>
            <p className="nav-card-desc">Abrir estrutura hierárquica</p>
          </Link>

          {user?.role === 'ADMIN' ? (
            <Link to="/users" className="nav-card">
              <p className="nav-card-section">Administração</p>
              <p className="nav-card-title">Usuários</p>
              <p className="nav-card-desc">Gerenciar contas e acessos</p>
            </Link>
          ) : null}
        </div>
      </div>
    </>
  );
}
