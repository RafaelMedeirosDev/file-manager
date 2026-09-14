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
import type {
  AuthUser,
  LoginAuthenticated,
  LoginPayload,
  LoginResponse,
  SessionOrganization,
} from '../../types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  organization: SessionOrganization | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /**
   * Devolve a resposta em vez de `void` porque o login tem dois desfechos:
   * ou ja veio a sessao, ou falta escolher a organizacao. Quem ramifica por
   * `status` e o `useLogin`; aqui so se grava o que for sessao.
   */
  login: (payload: LoginPayload) => Promise<LoginResponse>;
  selectOrganization: (
    preAuthToken: string,
    organizationId: string,
  ) => Promise<void>;
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

  /**
   * Unico ponto que escreve sessao. Os dois caminhos do login convergem aqui,
   * e e o que mantem `preAuthToken` fora do storage: ele nunca passa por esta
   * funcao.
   */
  const startSession = useCallback((authenticated: LoginAuthenticated) => {
    const nextSession: Session = {
      accessToken: authenticated.accessToken,
      user: authenticated.user,
      organization: authenticated.organization,
    };

    writeSession(nextSession);
    setSession(nextSession);
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await authService.login(payload);

      if (response.status === 'authenticated') {
        startSession(response);
      }

      return response;
    },
    [startSession],
  );

  const selectOrganization = useCallback(
    async (preAuthToken: string, organizationId: string) => {
      const authenticated = await authService.selectOrganization(
        preAuthToken,
        organizationId,
      );

      startSession(authenticated);
    },
    [startSession],
  );

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

        // O erro precisa seguir intacto: os chamadores leem
        // error.response.data.message via getApiErrorMessage, e envolve-lo
        // num Error perderia essa informacao.
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        return Promise.reject(error);
      },
    );

    // Sem o eject, o StrictMode registraria o interceptor duas vezes.
    return () => api.interceptors.response.eject(interceptorId);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      organization: session?.organization ?? null,
      accessToken: session?.accessToken ?? null,
      isAuthenticated: Boolean(session?.accessToken),
      login,
      selectOrganization,
      logout,
    }),
    [session, login, selectOrganization, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
