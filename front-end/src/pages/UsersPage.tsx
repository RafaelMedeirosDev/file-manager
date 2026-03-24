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
      <h1>Usuarios</h1>
      {loading ? <p>Carregando...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {!loading && !error ? (
        <ul className="item-list">
          {users.map((user) => (
            <li key={user.id}>
              <span>
                {user.name} - {user.email}
              </span>
              <strong>{user.role}</strong>
            </li>
          ))}
          {users.length === 0 ? <li>Nenhum usuario encontrado.</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
