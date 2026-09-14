import type { AuthUser, SessionOrganization } from '../../types/auth';

export type Session = {
  accessToken: string;
  user: AuthUser;
  organization: SessionOrganization;
};

// Modulo folha de proposito: `api.ts` e o `AuthContext` precisam da mesma
// chave e do mesmo parse, mas `api.ts` nao pode importar o contexto sem fechar
// o ciclo api -> AuthContext -> authService -> api.
/**
 * O sufixo de versao existe para que uma sessao gravada pela versao anterior
 * seja descartada de forma determinista. Sem ele, a entrada antiga -- que nao
 * tem `organization` -- seria lida como valida, e o campo ficaria `undefined`
 * ate alguem tentar renderiza-lo. Trocar a chave custa um login a mais, uma
 * vez, e elimina a classe inteira de bug.
 */
export const SESSION_KEY = 'file-manager:session:v2';

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
