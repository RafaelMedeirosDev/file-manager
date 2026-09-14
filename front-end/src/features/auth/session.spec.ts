import { beforeEach, describe, expect, it } from 'vitest';
import {
  SESSION_KEY,
  clearSession,
  readSession,
  writeSession,
  type Session,
} from './session';

const session: Session = {
  accessToken: 'token-de-sessao',
  user: {
    id: 'user-1',
    name: 'Rafael',
    email: 'rafael@example.com',
    role: 'ADMIN',
  },
  organization: { id: 'org-1', name: 'Principal', slug: 'principal' },
};

beforeEach(() => {
  localStorage.clear();
});

describe('session', () => {
  it('grava sob a chave versionada v2', () => {
    // A chave e contrato: trocar o valor desloga todo mundo de uma vez. O
    // teste existe para que essa troca seja deliberada, nao acidental.
    expect(SESSION_KEY).toBe('file-manager:session:v2');

    writeSession(session);

    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
  });

  it('faz round-trip de escrita e leitura', () => {
    writeSession(session);

    expect(readSession()).toEqual(session);
  });

  it('devolve null quando nao ha sessao gravada', () => {
    expect(readSession()).toBeNull();
  });

  it('descarta E REMOVE uma entrada corrompida', () => {
    localStorage.setItem(SESSION_KEY, '{nao e json');

    expect(readSession()).toBeNull();
    // A remocao e o que impede o erro de se repetir a cada requisicao: sem
    // ela, a entrada quebrada ficaria no storage para sempre.
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('clearSession remove a entrada', () => {
    writeSession(session);

    clearSession();

    expect(readSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
