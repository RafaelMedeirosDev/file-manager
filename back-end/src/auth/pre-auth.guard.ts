import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard do passo 2 do login. O nome 'jwt-pre-auth' precisa casar com o
 * segundo argumento de `PassportStrategy` em pre-auth.strategy.ts.
 */
@Injectable()
export class PreAuthGuard extends AuthGuard('jwt-pre-auth') {}
