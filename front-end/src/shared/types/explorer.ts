/** Union type que representa uma entrada na listagem de conteúdo de uma pasta. */
export type ExplorerEntry =
  | { type: 'folder'; id: string; name: string }
  | { type: 'file'; id: string; name: string; extension: string };
