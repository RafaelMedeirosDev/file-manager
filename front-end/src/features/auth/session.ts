import type { AuthUser } from '../../types/auth';

export type Session = {
  accessToken: string;
  user: AuthUser;
};

// Modulo folha de proposito: `api.ts` e o `AuthContext` precisam da mesma
// chave e do mesmo parse, mas `api.ts` nao pode importar o contexto sem fechar
// o ciclo api -> AuthContext -> authService -> api.
export const SESSION_KEY = 'file-manager:session';

/**
 * Le a sessao do storage. Uma entrada corrompida e descartada em vez de
 * derrubar a aplicacao — quem chama so precisa saber se ha sessao ou nao.
 */
export function readSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function writeSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
