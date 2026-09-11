import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '../config/env';
import { UserRepository } from '../repositories/UserRepository';
import { TOKEN_AUDIENCE } from '../shared/constants/token.constants';

/** O pre-auth nao conhece organizacao: escolher uma e justamente o que falta. */
export type PreAuthClaims = {
  sub: string;
  email: string;
};

export type PreAuthUser = {
  sub: string;
  email: string;
};

/**
 * Strategy do passo 2 do login. Autentica quem ja provou a senha mas ainda nao
 * escolheu a organizacao.
 *
 * O segundo argumento de `PassportStrategy` e obrigatorio, nao estilo: a
 * JwtStrategy chama `PassportStrategy(Strategy)` sem nome, o que registra sob
 * o default 'jwt'. Uma segunda strategy herdando do mesmo `Strategy` sem nome
 * proprio sobrescreveria aquele registro, e a falha seria silenciosa -- as
 * rotas de negocio passariam a aceitar pre-auth.
 */
@Injectable()
export class PreAuthJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-pre-auth',
) {
  constructor(private readonly userRepository: UserRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
      audience: TOKEN_AUDIENCE.PRE_AUTH,
    });
  }

  /**
   * Confere so o usuario, porque a associacao e o que esta sendo escolhido --
   * quem valida o par (usuario, organizacao) e o AuthService, que responde 403
   * quando a escolha nao procede.
   */
  async validate(payload: PreAuthClaims): Promise<PreAuthUser> {
    const user = await this.userRepository.findById(payload.sub);

    // findById nao filtra deletedAt, entao a checagem e explicita aqui.
    if (!user || user.deletedAt) {
      throw new UnauthorizedException();
    }

    return { sub: user.id, email: user.email };
  }
}
