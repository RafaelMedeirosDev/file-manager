import { SetMetadata } from '@nestjs/common';

export const SKIP_JWT_AUTH_KEY = 'skipJwtAuth';

/**
 * Retira a rota do JwtAuthGuard global.
 *
 * **Isto nao torna a rota publica.** O nome descreve exatamente o que faz:
 * pular um guard. Quem aplica e responsavel por declarar o que a rota exige
 * no lugar -- nada, se ela e mesmo publica, ou outro `@UseGuards`.
 *
 * As tres rotas que usam hoje nao sao da mesma natureza, e e por isso que o
 * decorator nao se chama `@Public`:
 *
 *   GET  /                                     publica de fato
 *   POST /auth/login                           publica de fato
 *   POST /auth/organizations/:id/token         AUTENTICADA, por pre-auth
 *
 * Na terceira, `@Public` seria uma afirmacao falsa sobre uma rota que exige
 * credencial -- o tipo de erro de leitura que tem consequencia de seguranca.
 *
 * A metadata e lida com `getAllAndOverride([handler, class])`, mesmo mecanismo
 * do @Roles: aplicado num metodo, sobrepoe o que a classe declarou.
 */
export const SkipJwtAuth = () => SetMetadata(SKIP_JWT_AUTH_KEY, true);
