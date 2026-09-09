import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDTO } from '../shared/dto/auth/LoginDTO';
import { ApiTags } from '@nestjs/swagger';

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
}
