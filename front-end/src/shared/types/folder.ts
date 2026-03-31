import type { FileItem } from './file';

export type FolderItem = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Referência leve usada em relações pai/filho dentro de FolderDetails. */
export type FolderChild = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
};

/** Usado em selects de criação de arquivo, onde só precisamos id/nome/dono. */
export type FolderOption = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
};

/** Resposta completa do GET /folders/:id — inclui hierarquia e arquivos. */
export type FolderDetails = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  parent: FolderChild | null;
  children: FolderChild[];
  files: FileItem[];
  createdAt: string;
  updatedAt: string;
};
