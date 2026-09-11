import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDTO } from '../shared/dto/auth/LoginDTO';
import { AuthOrganizationParamsDTO } from '../shared/dto/auth/AuthOrganizationParamsDTO';
import { PreAuthGuard } from './pre-auth.guard';
import type { PreAuthUser } from './pre-auth.strategy';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Limite bem mais estrito que o teto global: esta e a unica rota publica
  // que aceita credenciais, e sem isto um brute force nao encontra barreira.
  // Cinco tentativas por minuto por IP acomodam quem erra a senha e nao
  // acomodam quem varre uma lista.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @ApiOkResponse({
    description:
      'Com uma organizacao, devolve `status: "authenticated"` com o accessToken. ' +
      'Com duas ou mais, devolve `status: "organization_required"` com o preAuthToken e a lista.',
  })
  @ApiUnauthorizedResponse({
    description:
      'Credencial invalida, usuario excluido ou sem nenhuma organizacao ativa',
  })
  login(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: LoginDTO,
  ) {
    return this.authService.login(body);
  }

  /**
   * Passo 2 do login: troca o pre-auth pelo token da organizacao escolhida.
   *
   * Usa a PreAuthGuard, e nao a JwtAuthGuard: um token de sessao nao serve
   * aqui, e um pre-auth nao serve em nenhuma rota de negocio. A separacao e
   * pela audiencia gravada no proprio token.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('organizations/:organizationId/token')
  @UseGuards(PreAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: 'Token de sessao da organizacao escolhida' })
  @ApiUnauthorizedResponse({
    description:
      'preAuthToken ausente, invalido, expirado ou de outra audiencia',
  })
  @ApiForbiddenResponse({
    description: 'Usuario nao pertence a organizacao informada',
  })
  createOrganizationToken(
    @Param(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    params: AuthOrganizationParamsDTO,
    @Req() req: Request & { user: PreAuthUser },
  ) {
    return this.authService.createTokenForOrganization(
      req.user.sub,
      params.organizationId,
    );
  }
}
