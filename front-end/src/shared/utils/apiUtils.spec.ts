// @vitest-environment node
//
// Modulo sem DOM: as tres funcoes sao puras e o ambiente jsdom global seria
// custo sem retorno. O opt-out e por arquivo justamente para isso.
import { describe, expect, it } from 'vitest';
import {
  getApiErrorMessage,
  getApiErrorStatus,
  normalizePaginatedResponse,
} from './apiUtils';

describe('getApiErrorMessage', () => {
  it('devolve a mensagem quando o backend manda uma string', () => {
    const error = { response: { data: { message: 'Credenciais invalidas' } } };

    expect(getApiErrorMessage(error, 'fallback')).toBe('Credenciais invalidas');
  });

  it('junta as mensagens quando o class-validator manda um array', () => {
    // Formato real de um 400 do ValidationPipe do backend.
    const error = {
      response: {
        data: { message: ['email must be an email', 'password too short'] },
      },
    };

    expect(getApiErrorMessage(error, 'fallback')).toBe(
      'email must be an email, password too short',
    );
  });

  it('cai no fallback quando nao ha response -- erro de rede', () => {
    expect(getApiErrorMessage(new Error('Network Error'), 'fallback')).toBe(
      'fallback',
    );
  });

  it('cai no fallback quando message nao e string nem array', () => {
    const error = { response: { data: { message: { code: 500 } } } };

    expect(getApiErrorMessage(error, 'fallback')).toBe('fallback');
  });

  it('cai no fallback com erro null, sem lancar', () => {
    expect(getApiErrorMessage(null, 'fallback')).toBe('fallback');
  });
});

describe('getApiErrorStatus', () => {
  it('devolve o status quando ha response', () => {
    expect(getApiErrorStatus({ response: { status: 401 } })).toBe(401);
  });

  it('devolve undefined em erro de rede, quando a requisicao nem teve resposta', () => {
    expect(getApiErrorStatus(new Error('Network Error'))).toBeUndefined();
  });

  it('devolve undefined quando o status nao e numero', () => {
    expect(getApiErrorStatus({ response: { status: '401' } })).toBeUndefined();
  });
});

describe('normalizePaginatedResponse', () => {
  it('absorve o array cru dos endpoints legados', () => {
    const payload = [{ id: 'a' }, { id: 'b' }];

    const result = normalizePaginatedResponse<{ id: string }>(payload, 3, 10);

    expect(result.items).toHaveLength(2);
    expect(result.isLegacyArray).toBe(true);
    // A pagina e 1 e nao o fallback: um array cru nao esta paginado, entao
    // herdar a pagina atual mentiria sobre a posicao.
    expect(result.meta).toEqual({
      page: 1,
      limit: 2,
      total: 2,
      hasNextPage: false,
    });
  });

  it('preserva o meta quando a resposta vem no formato { data, meta }', () => {
    const payload = {
      data: [{ id: 'a' }],
      meta: { page: 2, limit: 10, total: 25, hasNextPage: true },
    };

    const result = normalizePaginatedResponse<{ id: string }>(payload, 1, 10);

    expect(result.items).toHaveLength(1);
    expect(result.isLegacyArray).toBe(false);
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      hasNextPage: true,
    });
  });

  it('usa os fallbacks campo a campo quando o meta vem incompleto', () => {
    const payload = { data: [{ id: 'a' }, { id: 'b' }], meta: { total: 7 } };

    const result = normalizePaginatedResponse<{ id: string }>(payload, 4, 20);

    expect(result.meta).toEqual({
      page: 4,
      limit: 20,
      total: 7,
      hasNextPage: false,
    });
  });

  it('devolve lista vazia quando data nao e array', () => {
    const result = normalizePaginatedResponse<{ id: string }>(
      { data: null },
      1,
      10,
    );

    expect(result.items).toEqual([]);
    expect(result.meta.total).toBe(0);
  });
});
