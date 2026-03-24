import { Link } from 'react-router-dom';

export function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Escolha uma secao para comecar.</p>
      <div className="quick-links">
        <Link to="/folders" className="card-link">
          Navegar nas pastas
        </Link>
        <Link to="/files" className="card-link">
          Listar arquivos
        </Link>
      </div>
    </div>
  );
}
