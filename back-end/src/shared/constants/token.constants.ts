/**
 * As duas audiencias de token do sistema. Elas sao a fronteira que impede um
 * token sem organizacao de alcancar rota de negocio nenhuma.
 *
 * Cada passport strategy declara a sua audiencia no `super({...})`, e o
 * `passport-jwt` repassa isso ao `jwt.verify`. O efeito e que um token da
 * audiencia errada e recusado na **verificacao da assinatura**, antes de o
 * `validate()` da strategy rodar -- nao e um `if` da aplicacao que alguem
 * possa esquecer de escrever numa rota nova.
 *
 * Sao valores de contrato: mudar qualquer um destes strings invalida todos os
 * tokens em circulacao daquela audiencia.
 */
export const TOKEN_AUDIENCE = {
  /** Token de sessao. Carrega `organizationId` e abre as rotas de negocio. */
  API: 'api',
  /**
   * Emitido no passo 1 do login quando ha mais de uma organizacao. Serve
   * unicamente para trocar por um token de API em
   * `POST /auth/organizations/:organizationId/token`.
   */
  PRE_AUTH: 'pre-auth',
} as const;

/**
 * Curto de proposito: e uma credencial em transito na tela de escolha da
 * organizacao, nao uma sessao. O `signOptions` do JwtModule vale 1d, e este
 * valor sobrepoe aquele na chamada de assinatura.
 */
export const PRE_AUTH_TOKEN_EXPIRES_IN = '5m';
