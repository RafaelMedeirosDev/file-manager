import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ROLE } from '@prisma/client';
import request from 'supertest';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { FileController } from '../src/controllers/FileController';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import { env } from '../src/config/env';
import { CreateFileUseCase } from '../src/usecases/file/CreateFileUseCase';
import { ListFilesUseCase } from '../src/usecases/file/ListFilesUseCase';
import { GetFileByIdUseCase } from '../src/usecases/file/GetFileByIdUseCase';
import { DownloadFileUseCase } from '../src/usecases/file/DownloadFileUseCase';
import { UpdateFileUseCase } from '../src/usecases/file/UpdateFileUseCase';
import { SoftDeleteFileUseCase } from '../src/usecases/file/SoftDeleteFileUseCase';
import { UploadFileUseCase } from '../src/usecases/file/UploadFileUseCase';
import { BulkUploadFilesUseCase } from '../src/usecases/file/BulkUploadFilesUseCase';

@Injectable()
class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      sub: '22222222-2222-4222-8222-222222222222',
      email: 'user@example.com',
      role: ROLE.USER,
    };
    return true;
  }
}

const FOLDER_ID = '33333333-3333-4333-8333-333333333333';

describe('Upload limits (e2e)', () => {
  let app: INestApplication;
  const uploadFileUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    const noop = { execute: jest.fn() };

    const moduleBuilder = Test.createTestingModule({
      controllers: [FileController],
      providers: [
        Reflector,
        RolesGuard,
        { provide: CreateFileUseCase, useValue: noop },
        { provide: ListFilesUseCase, useValue: noop },
        { provide: GetFileByIdUseCase, useValue: noop },
        { provide: DownloadFileUseCase, useValue: noop },
        { provide: UpdateFileUseCase, useValue: noop },
        { provide: SoftDeleteFileUseCase, useValue: noop },
        { provide: UploadFileUseCase, useValue: uploadFileUseCase },
        { provide: BulkUploadFilesUseCase, useValue: noop },
      ],
    });

    moduleBuilder.overrideGuard(JwtAuthGuard).useClass(TestJwtAuthGuard);

    const moduleFixture: TestingModule = await moduleBuilder.compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('devolve 413 com mensagem padronizada quando o arquivo excede o limite', async () => {
    const oversized = Buffer.alloc(env.MAX_UPLOAD_SIZE_BYTES + 1024);

    const response = await request(app.getHttpServer())
      .post('/files/upload')
      .field('name', 'grande')
      .field('folderId', FOLDER_ID)
      .attach('file', oversized, 'grande.pdf');

    expect(response.status).toBe(413);
    expect(response.body.message).toBe(ErrorMessagesEnum.FILE_TOO_LARGE);
    // o multer aborta no transporte: o use case nunca chega a ser chamado
    expect(uploadFileUseCase.execute).not.toHaveBeenCalled();
  });

  it('devolve 415 para extensao fora da whitelist', async () => {
    uploadFileUseCase.execute.mockRejectedValueOnce(
      new UnsupportedMediaTypeException(
        ErrorMessagesEnum.FILE_TYPE_NOT_ALLOWED,
      ),
    );

    const response = await request(app.getHttpServer())
      .post('/files/upload')
      .field('name', 'malicioso')
      .field('folderId', FOLDER_ID)
      .attach('file', Buffer.from('<svg onload=alert(1)>'), 'malicioso.svg');

    expect(response.status).toBe(415);
    expect(response.body.message).toBe(ErrorMessagesEnum.FILE_TYPE_NOT_ALLOWED);
  });

  it('aceita arquivo dentro do limite e com extensao permitida', async () => {
    uploadFileUseCase.execute.mockResolvedValueOnce({ id: 'file-1' });

    const response = await request(app.getHttpServer())
      .post('/files/upload')
      .field('name', 'laudo')
      .field('folderId', FOLDER_ID)
      .attach('file', Buffer.from('%PDF-1.4'), 'laudo.pdf');

    expect(response.status).toBe(201);
    expect(uploadFileUseCase.execute).toHaveBeenCalledTimes(1);
  });
});
