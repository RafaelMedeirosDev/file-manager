import type {
  LoginAuthenticated,
  LoginResponse,
  Role,
} from '@file-manager/shared';

/**
 * O contrato de login vive em `@file-manager/shared` e e reexportado aqui,
 * seguindo o padrao de `src/shared/types/*.ts`.
 *
 * Este arquivo era uma copia manual: declarava `LoginResponse` como objeto
 * plano com `accessToken` sempre presente. Como o backend passou a responder
 * tambem `status: 'organization_required'` -- sem token --, a copia deixou de
 * descrever a realidade, e o front lia `undefined` sem perceber.
 */
export type { LoginAuthenticated, LoginResponse };

/** Papel do usuario NA organizacao em que ele entrou, nao um papel global. */
export type UserRole = Role;

export type AuthUser = LoginAuthenticated['user'];

export type SessionOrganization = LoginAuthenticated['organization'];

/** Corpo da requisicao de login. Fica local: nao e contrato de resposta. */
export type LoginPayload = {
  email: string;
  password: string;
};
