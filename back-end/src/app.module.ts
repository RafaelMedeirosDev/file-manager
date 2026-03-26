import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './controllers/UserController';
import { FolderController } from './controllers/FolderController';
import { FileController } from './controllers/FileController';
import { AuthModule } from './auth/auth.module';
import { CreateUserUseCase } from './usecases/user/CreateUserUseCase';
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
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AppController, UserController, FolderController, FileController],
  providers: [
    AppService,
    CreateUserUseCase,
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
    FolderRepository,
    FileRepository,
  ],
})
export class AppModule {}

