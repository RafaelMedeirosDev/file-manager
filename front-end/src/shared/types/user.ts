export type UserItem = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
  updatedAt: string;
};

/** Usado em selects onde só precisamos identificar o dono de um recurso. */
export type UserOption = {
  id: string;
  name: string;
  email: string;
};
