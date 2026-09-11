import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ROLE } from '@prisma/client';
import { env } from '../config/env';
import { MembershipRepository } from '../repositories/MembershipRepository';
import { TOKEN_AUDIENCE } from '../shared/constants/token.constants';

/**
 * O que e efetivamente assinado no token de sessao.
 *
 * `role` nao esta aqui de proposito: e lido do banco a cada requisicao (ver
 * `validate`). `organizationId` esta, e e o unico jeito de a requisicao saber
 * em qual organizacao o portador entrou -- a associacao nao da para deduzir do
 * `sub`, porque a mesma pessoa pode pertencer a varias.
 */
export type SignedJwtClaims = {
  sub: string;
  email: string;
  organizationId: string;
};

/**
 * O que chega em `req.user`. O nome do tipo e mantido porque 12 handlers de
 * controller, o RolesGuard e o HttpLoggingInterceptor o importam.
 */
export type JwtPayload = {
  sub: string;
  email: string;
  organizationId: string;
  role: ROLE;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly membershipRepository: MembershipRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
      // Recusa qualquer token que nao seja de sessao. E o que barra o
      // pre-auth do passo 2 do login em todas as rotas de negocio, de uma vez
      // e sem depender de decorator por controller.
      audience: TOKEN_AUDIENCE.API,
    });
  }

  /**
   * Confere a associacao no banco a cada requisicao, em vez de confiar apenas
   * no conteudo do token. Antes, um usuario excluido seguia com acesso pleno
   * ate o token expirar — e a validade e de um dia. O mesmo vale agora para
   * quem foi removido de uma organizacao ou rebaixado nela.
   *
   * O retorno mantem o shape de JwtPayload de proposito: `req.user` e lido
   * pelos controllers, pelo RolesGuard e pelo HttpLoggingInterceptor, que
   * esperam `sub`. Devolver a entidade do Prisma trocaria `sub` por `id` e
   * quebraria os tres — o log, em silencio.
   *
   * Como a role vem da associacao, e nao do token, rebaixar alguem numa
   * organizacao passa a valer na hora.
   */
  async validate(payload: SignedJwtClaims): Promise<JwtPayload> {
    // Cinto e suspensorio: a audiencia declarada acima ja recusaria um token
    // sem organizacao, mas essa guarda e a unica que um teste unitario
    // consegue afirmar diretamente, e e barata.
    if (!payload.organizationId) {
      throw new UnauthorizedException();
    }

    const membership =
      await this.membershipRepository.findByUserAndOrganization(
        payload.sub,
        payload.organizationId,
      );

    // findByUserAndOrganization nao filtra deletedAt em nenhum dos tres
    // niveis, entao as checagens sao explicitas aqui. Este e um dos dois
    // unicos lugares do sistema que olham `organization.deletedAt` -- as
    // consultas de negocio recortam por organizationId e nao precisam.
    if (
      !membership ||
      membership.deletedAt ||
      membership.user.deletedAt ||
      membership.organization.deletedAt
    ) {
      throw new UnauthorizedException();
    }

    return {
      sub: membership.user.id,
      email: membership.user.email,
      organizationId: membership.organizationId,
      role: membership.role,
    };
  }
}
