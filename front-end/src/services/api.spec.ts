import type { AxiosAdapter } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeSession, type Session } from '../features/auth/session';
import { api } from './api';

const session: Session = {
  accessToken: 'token-da-sessao',
  user: {
    id: 'user-1',
    name: 'Rafael',
    email: 'rafael@example.com',
    role: 'ADMIN',
  },
  organization: { id: 'org-1', name: 'Principal', slug: 'principal' },
};

/**
 * Devolve a config que chegou ate o adapter, que e o ponto depois de todos os
 * interceptors de request. E o que permite testar o interceptor REAL rodando,
 * em vez de reimplementar a logica dele dentro do teste.
 */
const echoAdapter: AxiosAdapter = (config) =>
  Promise.resolve({
    data: null,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });

const originalAdapter = api.defaults.adapter;

beforeEach(() => {
  localStorage.clear();
  api.defaults.adapter = echoAdapter;
});

afterEach(() => {
  // restoreMocks nao desfaz uma atribuicao manual.
  api.defaults.adapter = originalAdapter;
});

describe('interceptor de request do axios', () => {
  it('nao manda Authorization quando nao ha sessao', async () => {
    const response = await api.get('/users');

    expect(response.config.headers.Authorization).toBeUndefined();
  });

  it('injeta o token da sessao quando ha sessao gravada', async () => {
    writeSession(session);

    const response = await api.get('/users');

    expect(response.config.headers.Authorization).toBe(
      'Bearer token-da-sessao',
    );
  });

  it('preserva um Authorization definido na chamada, mesmo com sessao no storage', async () => {
    // Este e o caso que a guarda `!config.headers.Authorization` protege, e o
    // bug que ela corrigiu: o passo 2 do login manda o pre-auth explicitamente
    // e ele NAO e a sessao. Sem a guarda, uma sessao antiga sobrescreveria
    // aquele header e a troca de organizacao responderia 401 -- por um motivo
    // que ninguem acharia olhando o codigo da troca.
    writeSession(session);

    const response = await api.post(
      '/auth/organizations/org-demo/token',
      null,
      {
        headers: { Authorization: 'Bearer pre-auth-em-transito' },
      },
    );

    expect(response.config.headers.Authorization).toBe(
      'Bearer pre-auth-em-transito',
    );
  });
});
