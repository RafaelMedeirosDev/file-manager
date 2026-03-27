import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from './config/env';
import { HttpLoggingInterceptor } from './shared/interceptors/HttpLoggingInterceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: env.LOG_LEVELS,
  });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  await app.listen(env.PORT);

  const logger = new Logger('Bootstrap');
  logger.log(
    `API running on port ${env.PORT} (${env.NODE_ENV}) | log levels: ${env.LOG_LEVELS.join(', ')}`,
  );
}

bootstrap();
