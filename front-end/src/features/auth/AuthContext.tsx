import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { authService } from './services/authService';
import { api } from '../../services/api';
import { getApiErrorStatus } from '../../shared/utils/apiUtils';
import {
  clearSession,
  readSession,
  writeSession,
  type Session,
} from './session';
import type { AuthUser, LoginPayload } from '../../types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
};

/**
 * Rotas em que um 401 significa "credencial desta operacao invalida", e nao
 * "sessao expirada" — deslogar nelas seria um falso positivo:
 *
 * - /auth/login: e-mail ou senha errados. O useLogin ja mostra o erro inline;
 *   deslogar remontaria a LoginPage e apagaria essa mensagem.
 * - /users/me/password: senha ATUAL incorreta. O usuario esta autenticado com
 *   token valido e seria deslogado por errar a senha antiga.
 *
 * Qualquer outro 401 vem do guard JWT e e sessao invalida de verdade.
 */
const ROUTES_WITH_EXPECTED_401 = ['/auth/login', '/users/me/password'];

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(() => readSession());

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await authService.login(payload);

    const nextSession: Session = {
      accessToken: response.accessToken,
      user: response.user,
    };

    writeSession(nextSession);
    setSession(nextSession);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  // Sem isto, um token expirado deixa o app "logado": isAuthenticated so olha
  // se existe um token, nao se ele vale. Nao e preciso navegar aqui — o
  // ProtectedRoute redireciona sozinho quando isAuthenticated vira false.
  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        const url = (error as { config?: { url?: string } })?.config?.url ?? '';
        const isExpectedHere = ROUTES_WITH_EXPECTED_401.some((route) =>
          url.includes(route),
        );

        // readSession() torna o logout idempotente: uma pagina dispara varias
        // requisicoes em paralelo e um token expirado devolve varios 401 quase
        // ao mesmo tempo. Tambem exclui o login por construcao, ja que ali
        // ainda nao ha sessao gravada.
        if (
          getApiErrorStatus(error) === 401 &&
          !isExpectedHere &&
          readSession()
        ) {
          logout();
        }

        return Promise.reject(error);
      },
    );

    // Sem o eject, o StrictMode registraria o interceptor duas vezes.
    return () => api.interceptors.response.eject(interceptorId);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      isAuthenticated: Boolean(session?.accessToken),
      login,
      logout,
    }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
