import type { Role } from '../enums/Role';

export type UserItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

/** Usado em selects onde só precisamos identificar o dono de um recurso. */
export type UserOption = {
  id: string;
  name: string;
  email: string;
};
