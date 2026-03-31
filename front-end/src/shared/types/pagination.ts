export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
};

/** Resposta paginada bruta que vem da API. */
export type ListResponse<T> = {
  data: T[];
  meta: PaginatedMeta;
};

/**
 * Resposta normalizada usada internamente pelos hooks.
 * isLegacyArray indica que a API retornou um array simples
 * em vez do envelope { data, meta }.
 */
export type PaginatedResult<T> = {
  items: T[];
  meta: PaginatedMeta;
  isLegacyArray: boolean;
};
