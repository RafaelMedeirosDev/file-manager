import { ConflictException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FolderRepository } from '../../repositories/FolderRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

export type CreateFolderInput = {
  name: string;
  userId: string;
  folderId?: string;
};

export type CreateFolderOutput = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CreateFolderUseCase {
  private readonly logger = new Logger(CreateFolderUseCase.name);
  constructor(
    private readonly userRepository: UserRepository,
    private readonly folderRepository: FolderRepository,
  ) {}

  async execute(input: CreateFolderInput): Promise<CreateFolderOutput> {
    this.logger.log('[CreateFolderUseCase] Execute started');
    const user = await this.userRepository.findById(input.userId);

    if (!user || user.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND);
    }

    if (input.folderId) {
      const parentFolder = await this.folderRepository.findById(input.folderId);

      if (!parentFolder || parentFolder.deletedAt) {
        throw new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND);
      }
    }

    const activeFolderWithSameName =
      await this.folderRepository.findActiveByUserIdAndName({
        userId: input.userId,
        name: input.name,
      });

    if (activeFolderWithSameName) {
      throw new ConflictException(ErrorMessagesEnum.FOLDER_NAME_ALREADY_REGISTERED);
    }

    const folder = await this.folderRepository.create({
      name: input.name,
      userId: input.userId,
      folderId: input.folderId,
    });
    this.logger.log('[CreateFolderUseCase] Execute finished');


    return {
      id: folder.id,
      name: folder.name,
      userId: folder.userId,
      folderId: folder.folderId,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }
}



