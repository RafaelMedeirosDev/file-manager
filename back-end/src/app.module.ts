import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './controllers/UserController';
import { FolderController } from './controllers/FolderController';
import { FileController } from './controllers/FileController';
import { AuthModule } from './auth/auth.module';
import { CreateUserWithFoldersUseCase } from './usecases/user/CreateUserWithFoldersUseCase';
import { PrismaModule } from './database/prisma.module';
import { UserRepository } from './repositories/UserRepository';
import { UpdateUserUseCase } from './usecases/user/UpdateUserUseCase';
import { SoftDeleteUserUseCase } from './usecases/user/SoftDeleteUserUseCase';
import { ListUsersUseCase } from './usecases/user/ListUsersUseCase';
import { ChangeOwnPasswordUseCase } from './usecases/user/ChangeOwnPasswordUseCase';
import { FolderRepository } from './repositories/FolderRepository';
import { CreateFolderUseCase } from './usecases/folder/CreateFolderUseCase';
import { UpdateFolderUseCase } from './usecases/folder/UpdateFolderUseCase';
import { ListFoldersUseCase } from './usecases/folder/ListFoldersUseCase';
import { SoftDeleteFolderUseCase } from './usecases/folder/SoftDeleteFolderUseCase';
import { GetFolderByIdUseCase } from './usecases/folder/GetFolderByIdUseCase';
import { FileRepository } from './repositories/FileRepository';
import { CreateFileUseCase } from './usecases/file/CreateFileUseCase';
import { ListFilesUseCase } from './usecases/file/ListFilesUseCase';
import { UpdateFileUseCase } from './usecases/file/UpdateFileUseCase';
import { SoftDeleteFileUseCase } from './usecases/file/SoftDeleteFileUseCase';
import { GetFileByIdUseCase } from './usecases/file/GetFileByIdUseCase';
import { DownloadFileUseCase } from './usecases/file/DownloadFileUseCase';
import { UploadFileUseCase } from './usecases/file/UploadFileUseCase';
import { BulkUploadFilesUseCase } from './usecases/file/BulkUploadFilesUseCase';
import { RolesGuard } from './auth/roles.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ExamController } from './controllers/ExamController';
import { ExamRepository } from './repositories/ExamRepository';
import { CreateExamUseCase } from './usecases/exam/CreateExamUseCase';
import { ListExamsUseCase } from './usecases/exam/ListExamsUseCase';
import { SoftDeleteExamUseCase } from './usecases/exam/SoftDeleteExamUseCase';
import { ExamRequestController } from './controllers/ExamRequestController';
import { ExamRequestRepository } from './repositories/ExamRequestRepository';
import { OrganizationRepository } from './repositories/OrganizationRepository';
import { MembershipRepository } from './repositories/MembershipRepository';
import { CreateExamRequestUseCase } from './usecases/exam-request/CreateExamRequestUseCase';
import { GetExamRequestByIdUseCase } from './usecases/exam-request/GetExamRequestByIdUseCase';
import { ListExamRequestsUseCase } from './usecases/exam-request/ListExamRequestsUseCase';
import { UpdateExamRequestUseCase } from './usecases/exam-request/UpdateExamRequestUseCase';

@Module({
  imports: [
    // Teto global folgado: existe para conter abuso automatizado, nao para
    // atrapalhar uso normal. O login tem um limite proprio, bem mais estrito,
    // declarado no AuthController.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
  ],
  controllers: [
    AppController,
    UserController,
    FolderController,
    FileController,
    ExamController,
    ExamRequestController,
  ],
  providers: [
    // Guards globais, aplicados a TODA rota do Nest. A ordem aqui e a ordem de
    // execucao (o Nest empilha os APP_GUARD na ordem do array), e ela importa:
    //
    //   1. ThrottlerGuard  primeiro, para uma enxurrada nao autenticada ser
    //                      barrada antes de tocar o passport e o banco.
    //   2. JwtAuthGuard    fecha por default. Antes a autenticacao vinha de um
    //                      `@UseGuards` por controller, e esquece-lo deixava a
    //                      rota aberta em silencio. Rotas que nao passam por
    //                      ele declaram @SkipJwtAuth() explicitamente.
    //   3. RolesGuard      aplica o @Roles. Passa direto quando a rota nao
    //                      declara papel nenhum.
    //
    // Guards globais rodam antes dos de classe e dos de metodo. E por isso que
    // `POST /auth/organizations/:id/token`, que usa @UseGuards(PreAuthGuard) no
    // metodo, precisa de @SkipJwtAuth(): sem ele o guard global recusaria o
    // pre-auth pela audiencia antes de o guard da rota rodar.
    //
    // Nenhum dos tres cobre /docs e /docs-json -- middleware Express, fora do
    // pipeline de rotas. Ver o comentario em main.ts.
    //
    // As suites e2e que montam modulo proprio registram os proprios APP_GUARD,
    // espelhando esta ordem.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    AppService,
    CreateUserWithFoldersUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    SoftDeleteUserUseCase,
    ChangeOwnPasswordUseCase,
    CreateFolderUseCase,
    ListFoldersUseCase,
    GetFolderByIdUseCase,
    UpdateFolderUseCase,
    SoftDeleteFolderUseCase,
    CreateFileUseCase,
    ListFilesUseCase,
    GetFileByIdUseCase,
    DownloadFileUseCase,
    UpdateFileUseCase,
    SoftDeleteFileUseCase,
    UserRepository,
    OrganizationRepository,
    MembershipRepository,
    FolderRepository,
    FileRepository,
    ExamRepository,
    CreateExamUseCase,
    ListExamsUseCase,
    SoftDeleteExamUseCase,
    ExamRequestRepository,
    CreateExamRequestUseCase,
    GetExamRequestByIdUseCase,
    ListExamRequestsUseCase,
    UpdateExamRequestUseCase,
    UploadFileUseCase,
    BulkUploadFilesUseCase,
  ],
})
export class AppModule {}
