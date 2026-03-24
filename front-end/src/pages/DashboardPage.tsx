import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Acesso rapido aos principais fluxos.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="app-card border-brand-100 bg-brand-50 p-4">
          <p className="app-section-title">Perfil</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{user?.role}</p>
          <p className="text-xs text-slate-500">Permissoes ativas no sistema</p>
        </div>

        <Link to="/folders" className="app-card border-slate-200 p-4 transition hover:border-brand-200 hover:bg-brand-50">
          <p className="app-section-title">Navegacao</p>
          <p className="mt-2 text-lg font-bold text-slate-900">Pastas</p>
          <p className="text-xs text-slate-500">Abrir estrutura hierarquica</p>
        </Link>

        <Link to="/files" className="app-card border-slate-200 p-4 transition hover:border-brand-200 hover:bg-brand-50">
          <p className="app-section-title">Biblioteca</p>
          <p className="mt-2 text-lg font-bold text-slate-900">Arquivos</p>
          <p className="text-xs text-slate-500">Filtrar e baixar documentos</p>
        </Link>
      </div>
    </div>
  );
}
