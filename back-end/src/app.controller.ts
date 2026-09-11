import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags } from '@nestjs/swagger';
import { SkipJwtAuth } from './auth/skip-jwt-auth.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Health check: publica de fato. Sem o decorator, o JwtAuthGuard global
  // passaria a exigir token aqui.
  @SkipJwtAuth()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
