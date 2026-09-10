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
    // Guard global: as suites e2e montam modulo proprio e nao importam o
    // AppModule, entao nao enxergam este guard e seguem passando.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
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
    RolesGuard,
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
