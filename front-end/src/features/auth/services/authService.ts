import { api } from '../../../services/api';
import type {
  LoginAuthenticated,
  LoginPayload,
  LoginResponse,
} from '../../../types/auth';

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', payload);
    return response.data;
  },

  /**
   * Passo 2: troca o pre-auth pelo token da organizacao escolhida.
   *
   * O header vai explicito porque a credencial desta chamada NAO e a sessao --
   * e um token de curta duracao que so existe em memoria. O interceptor de
   * request respeita um Authorization ja definido justamente por isto.
   */
  async selectOrganization(
    preAuthToken: string,
    organizationId: string,
  ): Promise<LoginAuthenticated> {
    const response = await api.post<LoginAuthenticated>(
      `/auth/organizations/${organizationId}/token`,
      null,
      { headers: { Authorization: `Bearer ${preAuthToken}` } },
    );
    return response.data;
  },
};
