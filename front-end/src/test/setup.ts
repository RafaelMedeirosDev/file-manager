import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// O entrypoint `/vitest` do jest-dom e obrigatorio com `globals: false`: o
// entrypoint default chama um `expect` global que aqui nao existe.

/**
 * O cleanup a mao NAO e redundante.
 *
 * A Testing Library so registra o cleanup automatico quando encontra um
 * `afterEach` GLOBAL. Com `globals: false` esse global nao existe, o
 * auto-cleanup e ignorado EM SILENCIO, e o DOM de um teste vaza para o
 * proximo do mesmo arquivo -- o sintoma e uma query achar dois elementos onde
 * deveria haver um.
 *
 * O localStorage do jsdom persiste pelo mesmo motivo, e
 * src/features/auth/session.ts grava a sessao nele.
 */
afterEach(() => {
  cleanup();

  // O setup roda em TODO ambiente, e os specs puros declaram
  // `// @vitest-environment node`, onde localStorage nao existe. Sem a guarda,
  // o afterEach derruba justamente os testes que nao tocam DOM nenhum.
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
});
