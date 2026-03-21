import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { Readable } from 'node:stream';
import { ROLE } from '@prisma/client';
import { UserController } from '../src/controllers/UserController';
import { FolderController } from '../src/controllers/FolderController';
import { FileController } from '../src/controllers/FileController';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import { CreateUserUseCase } from '../src/usecases/user/CreateUserUseCase';
import { ListUsersUseCase } from '../src/usecases/user/ListUsersUseCase';
import { UpdateUserUseCase } from '../src/usecases/user/UpdateUserUseCase';
import { SoftDeleteUserUseCase } from '../src/usecases/user/SoftDeleteUserUseCase';
import { CreateFolderUseCase } from '../src/usecases/folder/CreateFolderUseCase';
import { ListFoldersUseCase } from '../src/usecases/folder/ListFoldersUseCase';
import { UpdateFolderUseCase } from '../src/usecases/folder/UpdateFolderUseCase';
import { SoftDeleteFolderUseCase } from '../src/usecases/folder/SoftDeleteFolderUseCase';
import { CreateFileUseCase } from '../src/usecases/file/CreateFileUseCase';
import { ListFilesUseCase } from '../src/usecases/file/ListFilesUseCase';
import { GetFileByIdUseCase } from '../src/usecases/file/GetFileByIdUseCase';
import { DownloadFileUseCase } from '../src/usecases/file/DownloadFileUseCase';
import { UpdateFileUseCase } from '../src/usecases/file/UpdateFileUseCase';
import { SoftDeleteFileUseCase } from '../src/usecases/file/SoftDeleteFileUseCase';

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;

    if (auth === 'Bearer admin-token') {
      req.user = {
        sub: 'admin-id',
        email: 'admin@example.com',
        role: ROLE.ADMIN,
      };
      return true;
    }

    if (auth === 'Bearer user-token') {
      req.user = {
        sub: 'user-id',
        email: 'user@example.com',
        role: ROLE.USER,
      };
      return true;
    }

    return false;
  }
}

describe('RBAC (e2e)', () => {
  let app: INestApplication;

  const createUserUseCase = {
    execute: jest.fn(async () => ({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Admin Created',
      email: 'created@example.com',
      role: ROLE.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };

  const listUsersUseCase = { execute: jest.fn(async () => []) };
  const updateUserUseCase = {
    execute: jest.fn(async () => ({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Updated',
      email: 'updated@example.com',
      role: ROLE.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };
  const softDeleteUserUseCase = {
    execute: jest.fn(async () => ({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Deleted',
      email: 'deleted@example.com',
      deletedAt: new Date().toISOString(),
    })),
  };

  const createFolderUseCase = {
    execute: jest.fn(async () => ({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Folder',
      userId: 'user-id',
      folderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };
  const listFoldersUseCase = { execute: jest.fn(async () => []) };
  const updateFolderUseCase = {
    execute: jest.fn(async () => ({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Folder Updated',
      userId: 'user-id',
      folderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };
  const softDeleteFolderUseCase = {
    execute: jest.fn(async () => ({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Folder',
      userId: 'user-id',
      folderId: null,
      deletedAt: new Date().toISOString(),
    })),
  };

  const createFileUseCase = {
    execute: jest.fn(async () => ({
      id: '33333333-3333-4333-8333-333333333333',
      name: 'File',
      userId: 'user-id',
      folderId: '22222222-2222-4222-8222-222222222222',
      extension: 'txt',
      url: 'https://example.com/file.txt',
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };
  const listFilesUseCase = { execute: jest.fn(async () => []) };
  const getFileByIdUseCase = {
    execute: jest.fn(async () => ({
      id: '33333333-3333-4333-8333-333333333333',
      name: 'File',
      userId: 'user-id',
      folderId: '22222222-2222-4222-8222-222222222222',
      extension: 'txt',
      url: 'https://example.com/file.txt',
      folder: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };
  const downloadFileUseCase = {
    execute: jest.fn(async () => ({
      stream: Readable.from(['ok']),
      fileName: 'file.txt',
      contentType: 'text/plain',
      contentLength: '2',
    })),
  };
  const updateFileUseCase = {
    execute: jest.fn(async () => ({
      id: '33333333-3333-4333-8333-333333333333',
      name: 'File',
      userId: 'user-id',
      folderId: '22222222-2222-4222-8222-222222222222',
      extension: 'txt',
      url: 'https://example.com/file-updated.txt',
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };
  const softDeleteFileUseCase = {
    execute: jest.fn(async () => ({
      id: '33333333-3333-4333-8333-333333333333',
      name: 'File',
      userId: 'user-id',
      folderId: '22222222-2222-4222-8222-222222222222',
      url: 'https://example.com/file.txt',
      deletedAt: new Date().toISOString(),
    })),
  };

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [UserController, FolderController, FileController],
      providers: [
        Reflector,
        RolesGuard,
        { provide: CreateUserUseCase, useValue: createUserUseCase },
        { provide: ListUsersUseCase, useValue: listUsersUseCase },
        { provide: UpdateUserUseCase, useValue: updateUserUseCase },
        { provide: SoftDeleteUserUseCase, useValue: softDeleteUserUseCase },
        { provide: CreateFolderUseCase, useValue: createFolderUseCase },
        { provide: ListFoldersUseCase, useValue: listFoldersUseCase },
        { provide: UpdateFolderUseCase, useValue: updateFolderUseCase },
        { provide: SoftDeleteFolderUseCase, useValue: softDeleteFolderUseCase },
        { provide: CreateFileUseCase, useValue: createFileUseCase },
        { provide: ListFilesUseCase, useValue: listFilesUseCase },
        { provide: GetFileByIdUseCase, useValue: getFileByIdUseCase },
        { provide: DownloadFileUseCase, useValue: downloadFileUseCase },
        { provide: UpdateFileUseCase, useValue: updateFileUseCase },
        { provide: SoftDeleteFileUseCase, useValue: softDeleteFileUseCase },
      ],
    });

    moduleBuilder.overrideGuard(JwtAuthGuard).useClass(TestJwtAuthGuard);

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('USER deve receber 403 ao tentar criar user', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', 'Bearer user-token')
      .send({
        name: 'User',
        email: 'user@example.com',
        password: '123456',
      })
      .expect(403);
  });

  it('USER deve receber 403 ao tentar criar folder', async () => {
    await request(app.getHttpServer())
      .post('/folders')
      .set('Authorization', 'Bearer user-token')
      .send({
        name: 'Folder',
        userId: '11111111-1111-4111-8111-111111111111',
      })
      .expect(403);
  });

  it('USER deve receber 403 ao tentar criar file', async () => {
    await request(app.getHttpServer())
      .post('/files')
      .set('Authorization', 'Bearer user-token')
      .send({
        name: 'File',
        userId: '11111111-1111-4111-8111-111111111111',
        folderId: '22222222-2222-4222-8222-222222222222',
        extension: 'txt',
        url: 'https://example.com/file.txt',
      })
      .expect(403);
  });

  it('USER deve conseguir listar folders e files', async () => {
    await request(app.getHttpServer())
      .get('/folders')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    await request(app.getHttpServer())
      .get('/files')
      .set('Authorization', 'Bearer user-token')
      .expect(200);
  });

  it('USER deve conseguir baixar arquivo', async () => {
    await request(app.getHttpServer())
      .get('/files/33333333-3333-4333-8333-333333333333/download')
      .set('Authorization', 'Bearer user-token')
      .expect(200)
      .expect('content-type', /text\/plain/);
  });

  it('ADMIN deve conseguir criar user, folder e file', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'User',
        email: 'user@example.com',
        password: '123456',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/folders')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Folder',
        userId: '11111111-1111-4111-8111-111111111111',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/files')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'File',
        userId: '11111111-1111-4111-8111-111111111111',
        folderId: '22222222-2222-4222-8222-222222222222',
        extension: 'txt',
        url: 'https://example.com/file.txt',
      })
      .expect(201);
  });
});
