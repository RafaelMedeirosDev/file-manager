import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/');
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message;
      setError(
        typeof apiMessage === 'string' ? apiMessage : 'Nao foi possivel autenticar.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#bfdbfe_0%,_#eff6ff_42%,_#f8fafc_100%)] p-4">
      <form className="app-card w-full max-w-md border-brand-100 p-6 shadow-soft" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">File Manager</h1>
        <p className="mt-1 text-sm text-slate-500">Acesse o painel com sua conta.</p>

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="email">
            Email
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="app-input mt-1"
              required
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
            Senha
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="app-input mt-1"
              required
            />
          </label>
        </div>

        {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

        <button type="submit" disabled={loading} className="btn-primary mt-5 w-full">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
