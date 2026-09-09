import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { env } from './config/env';
import { HttpLoggingInterceptor } from './shared/interceptors/HttpLoggingInterceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: env.LOG_LEVELS,
  });

  // Em producao a API fica atras do proxy da plataforma. Sem isto o Express
  // enxerga o IP do proxy em toda requisicao, e o rate limiting colocaria
  // todos os clientes no mesmo balde: barraria gente legitima sem conter
  // ninguem.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // A API nao serve HTML (nenhum ServeStatic, useStaticAssets ou @Render),
      // entao uma CSP aqui nao teria efeito pratico.
      contentSecurityPolicy: false,
      // O default `same-origin` bloquearia o front, que roda em outro dominio,
      // ao consumir o binario de GET /files/:id/download.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Allowlist explicita no lugar de refletir qualquer Origin.
  app.enableCors({
    origin: env.CORS_ORIGINS,
    credentials: true,
  });

  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  await app.listen(env.PORT);

  const logger = new Logger('Bootstrap');
  logger.log(
    `API running on port ${env.PORT} (${env.NODE_ENV}) | log levels: ${env.LOG_LEVELS.join(', ')} | cors: ${env.CORS_ORIGINS.join(', ')}`,
  );
}

void bootstrap();
