import type { Role } from '../enums/Role';

/**
 * A resposta de `POST /auth/login` e discriminada por `status`, porque um
 * usuario pode pertencer a mais de uma organizacao e nesse caso ainda nao ha
 * como saber em qual ele quer entrar.
 *
 * O atalho importa: com exatamente uma associacao ativa, o login ja devolve o
 * token da organizacao (`authenticated`) em vez de pedir uma escolha entre uma
 * opcao so. E o que mantem o fluxo de um passo para a esmagadora maioria dos
 * acessos.
 */
export type LoginAuthenticated = {
  status: 'authenticated';
  accessToken: string;
  /** `role` e o papel DENTRO da organizacao selecionada, nao um papel global. */
  user: { id: string; name: string; email: string; role: Role };
  organization: { id: string; name: string; slug: string };
};

/**
 * Duas ou mais associacoes ativas: o cliente escolhe e chama
 * `POST /auth/organizations/:organizationId/token` com o `preAuthToken`.
 *
 * O `preAuthToken` vive poucos minutos e nao abre nenhuma rota de negocio --
 * ele e assinado com outra audiencia, entao a strategy da API o rejeita na
 * verificacao da assinatura. Tambem nao deve ser persistido: se a pagina for
 * recarregada na tela de escolha, o certo e voltar ao login.
 */
export type LoginOrganizationRequired = {
  status: 'organization_required';
  preAuthToken: string;
  user: { id: string; name: string; email: string };
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: Role;
  }>;
};

export type LoginResponse = LoginAuthenticated | LoginOrganizationRequired;
