import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="app-page-title">Dashboard</h1>
      <p className="app-page-subtitle">Visao geral dos principais fluxos da plataforma.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="app-metric">
          <p className="app-metric-label">Perfil</p>
          <p className="app-metric-value">{user?.role}</p>
        </div>

        <div className="app-metric">
          <p className="app-metric-label">Permissao</p>
          <p className="app-metric-value text-xl">Acesso ativo</p>
        </div>

        <div className="app-metric">
          <p className="app-metric-label">Ambiente</p>
          <p className="app-metric-value text-xl">Produção local</p>
        </div>

        <div className="app-metric">
          <p className="app-metric-label">Workspace</p>
          <p className="app-metric-value text-xl">File Manager</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/folders" className="app-card p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50">
          <p className="app-section-title">Navegação</p>
          <p className="mt-2 text-lg font-bold text-slate-900">Pastas</p>
          <p className="text-xs text-slate-500">Abrir estrutura hierarquica</p>
        </Link>

        <Link to="/files" className="app-card p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50">
          <p className="app-section-title">Biblioteca</p>
          <p className="mt-2 text-lg font-bold text-slate-900">Arquivos</p>
          <p className="text-xs text-slate-500">Filtrar e baixar documentos</p>
        </Link>

        {user?.role === 'ADMIN' ? (
          <Link to="/users" className="app-card p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50">
            <p className="app-section-title">Administração</p>
            <p className="mt-2 text-lg font-bold text-slate-900">Usuários</p>
            <p className="text-xs text-slate-500">Gerenciar contas e acessos</p>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
