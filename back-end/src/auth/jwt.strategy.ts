import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ROLE } from '@prisma/client';
import { env } from '../config/env';
import { UserRepository } from '../repositories/UserRepository';

export type JwtPayload = {
  sub: string;
  email: string;
  role: ROLE;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userRepository: UserRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
    });
  }

  /**
   * Confere o usuario no banco a cada requisicao, em vez de confiar apenas no
   * conteudo do token. Antes, um usuario excluido seguia com acesso pleno ate
   * o token expirar — e a validade e de um dia.
   *
   * O retorno mantem o shape de JwtPayload de proposito: `req.user` e lido
   * pelos controllers, pelo RolesGuard e pelo HttpLoggingInterceptor, que
   * esperam `sub`. Devolver a entidade do Prisma trocaria `sub` por `id` e
   * quebraria os tres — o log, em silencio.
   *
   * Como a role vem do banco, rebaixar um usuario passa a valer na hora.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.userRepository.findById(payload.sub);

    // findById nao filtra deletedAt, entao a checagem e explicita aqui.
    if (!user || user.deletedAt) {
      throw new UnauthorizedException();
    }

    return { sub: user.id, email: user.email, role: user.role };
  }
}
