import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * A unica suite que importa o AppModule, e portanto a unica que enxerga os
 * guards globais. E aqui que o comportamento do JwtAuthGuard global se prova:
 * as outras duas montam modulo proprio e registram guards de teste.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('serves the health check without a token, because it declares @SkipJwtAuth', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  it('rejects a route that declares nothing when no token is sent', () => {
    // GET /users nao tem @UseGuards nem @SkipJwtAuth: quem a fecha e o
    // JwtAuthGuard global. Se este teste passar a devolver 200, o guard saiu
    // do AppModule e toda rota nova nasce aberta de novo.
    return request(app.getHttpServer()).get('/users').expect(401);
  });
});
