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
