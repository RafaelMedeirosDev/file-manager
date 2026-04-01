import { useLogin } from '../features/auth/hooks/useLogin';

export function LoginPage() {
  const { email, setEmail, password, setPassword, error, loading, handleSubmit } = useLogin();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">File Manager</h1>
          <p className="mt-1.5 text-sm text-slate-500">Entre para acessar seu workspace.</p>
        </div>

        <form className="app-card p-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              Email
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="app-input mt-1.5"
                placeholder="seu@email.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Senha
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="app-input mt-1.5"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>
          </div>

          {error ? (
            <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={loading} className="btn-primary mt-5 w-full py-2.5">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
