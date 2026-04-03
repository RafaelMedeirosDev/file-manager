export type { PaginatedMeta, ListResponse } from '@file-manager/shared';

/**
 * Resposta normalizada usada internamente pelos hooks.
 * isLegacyArray indica que a API retornou um array simples
 * em vez do envelope { data, meta }.
 */
export type PaginatedResult<T> = {
  items: T[];
  meta: import('@file-manager/shared').PaginatedMeta;
  isLegacyArray: boolean;
};
