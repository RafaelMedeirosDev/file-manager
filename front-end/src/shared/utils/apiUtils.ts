import type { PaginatedResult } from '../types';

/**
 * Extrai a mensagem de erro de uma resposta Axios.
 * O backend pode retornar message como string (erro simples)
 * ou como string[] (erros de validação do class-validator).
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;

  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join(', ');
  return fallback;
}

/**
 * Normaliza a resposta da API para o formato interno PaginatedResult<T>.
 *
 * O backend retorna { data: T[], meta: {...} }, mas versões antigas
 * ou endpoints sem paginação podem retornar um array simples.
 * Esta função absorve os dois casos e garante uma interface uniforme
 * para todos os hooks de listagem.
 */
export function normalizePaginatedResponse<T>(
  payload: unknown,
  fallbackPage: number,
  fallbackLimit: number,
): PaginatedResult<T> {
  if (Array.isArray(payload)) {
    return {
      items: payload as T[],
      meta: {
        page: 1,
        limit: payload.length,
        total: payload.length,
        hasNextPage: false,
      },
      isLegacyArray: true,
    };
  }

  const response = payload as {
    data?: T[];
    meta?: {
      page?: number;
      limit?: number;
      total?: number;
      hasNextPage?: boolean;
    };
  };

  const items = Array.isArray(response.data) ? response.data : [];
  const meta  = response.meta ?? {};

  return {
    items,
    meta: {
      page:        meta.page        ?? fallbackPage,
      limit:       meta.limit       ?? fallbackLimit,
      total:       meta.total       ?? items.length,
      hasNextPage: meta.hasNextPage ?? false,
    },
    isLegacyArray: false,
  };
}
