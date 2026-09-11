import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { SKIP_JWT_AUTH_KEY } from './skip-jwt-auth.decorator';

/**
 * Registrado como APP_GUARD no AppModule, entao vale para TODA rota do Nest
 * sem que nenhum controller precise declarar nada. E o que faz um controller
 * novo nascer fechado: antes, a autenticacao vinha de um `@UseGuards` por
 * controller, e esquece-lo deixava a rota aberta em silencio.
 *
 * Nao cobre `/docs` nem `/docs-json`: sao middleware do Express registrado
 * pelo SwaggerModule, fora do pipeline de rotas do Nest. Mesma limitacao do
 * ThrottlerGuard, documentada em main.ts.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_JWT_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return true;
    }

    return super.canActivate(context);
  }
}
