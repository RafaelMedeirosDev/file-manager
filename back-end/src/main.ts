import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { env } from './config/env';
import { HttpLoggingInterceptor } from './shared/interceptors/HttpLoggingInterceptor';
import { PrismaExceptionFilter } from './shared/filters/PrismaExceptionFilter';

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

  // Erro de constraint do banco deixa de vazar como 500 generico.
  app.useGlobalFilters(new PrismaExceptionFilter());

  // ── Documentacao da API ──────────────────────────────
  // Precisa vir antes do listen: o SwaggerModule registra middleware no
  // Express, e nao rota do Nest.
  //
  // Duas relacoes que nao sao obvias olhando este arquivo:
  //
  // 1. O Swagger UI so carrega porque a CSP do helmet esta desligada acima --
  //    ele usa script e estilo inline. Ligar contentSecurityPolicy quebra /docs.
  //
  // 2. O ThrottlerGuard global NAO cobre /docs nem /docs-json: ele atua no
  //    pipeline de rotas do Nest, e isto e middleware Express. E a unica
  //    superficie da API sem teto de requisicoes. O documento e montado uma vez
  //    no boot, entao o custo por request e apenas serializacao.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('File Manager API')
    .setDescription(
      'Gestao de arquivos por usuario, com hierarquia de pastas, RBAC de dois ' +
        'papeis e armazenamento em bucket privado. As respostas estao ' +
        'documentadas por status e descricao: os contratos vivem em ' +
        '@file-manager/shared como `type`, para serem compartilhados com o ' +
        'frontend sem carregar runtime, e OpenAPI exige classes.',
    )
    .setVersion('1.0')
    // O nome 'bearer' precisa casar com o argumento de @ApiBearerAuth nos
    // controllers. Se divergir, o botao Authorize aparece e o token nao e
    // anexado -- falha silenciosa classica desta configuracao.
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();

  SwaggerModule.setup('docs', app, () =>
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(env.PORT);

  const logger = new Logger('Bootstrap');
  logger.log(
    `API running on port ${env.PORT} (${env.NODE_ENV}) | log levels: ${env.LOG_LEVELS.join(', ')} | cors: ${env.CORS_ORIGINS.join(', ')} | docs: /docs`,
  );
}

void bootstrap();
