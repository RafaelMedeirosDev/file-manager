import { useEffect, useState } from 'react';
import { api } from '../services/api';

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
  updatedAt: string;
};

export function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      setError(null);

      try {
        const { data } = await api.get<UserItem[]>('/users');
        setUsers(data);
      } catch (err: any) {
        const apiMessage = err?.response?.data?.message;
        setError(typeof apiMessage === 'string' ? apiMessage : 'Erro ao carregar usuarios.');
      } finally {
        setLoading(false);
      }
    }

    void fetchUsers();
  }, []);

  return (
    <div>
      <h1 className="app-page-title">Usuarios</h1>
      <p className="app-page-subtitle">Painel administrativo de contas e perfis.</p>

      {loading ? <p className="mt-3 text-sm text-slate-500">Carregando...</p> : null}
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

      {!loading && !error ? (
        <ul className="mt-4 space-y-2">
          {users.map((user) => (
            <li key={user.id} className="app-list-item">
              <span className="text-sm text-slate-700">
                <span className="block font-semibold text-slate-900">{user.name}</span>
                <span className="text-slate-500">{user.email}</span>
              </span>
              <strong className="app-chip">{user.role}</strong>
            </li>
          ))}
          {users.length === 0 ? (
            <li className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
              Nenhum usuario encontrado.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
