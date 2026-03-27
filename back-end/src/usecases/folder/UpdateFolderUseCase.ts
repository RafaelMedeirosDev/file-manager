import { ConflictException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FolderRepository } from '../../repositories/FolderRepository';
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';

export type UpdateFolderInput = {
  id: string;
  name: string;
};

export type UpdateFolderOutput = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UpdateFolderUseCase {
  private readonly logger = new Logger(UpdateFolderUseCase.name);
  constructor(private readonly folderRepository: FolderRepository) {}

  async execute(input: UpdateFolderInput): Promise<UpdateFolderOutput> {
    this.logger.log('[UpdateFolderUseCase] Execute started');
    const existingFolder = await this.folderRepository.findById(input.id);

    if (!existingFolder || existingFolder.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND);
    }

    const activeFolderWithSameName =
      await this.folderRepository.findActiveByUserIdAndName({
        userId: existingFolder.userId,
        name: input.name,
        excludeId: existingFolder.id,
      });

    if (activeFolderWithSameName) {
      throw new ConflictException(ErrorMessagesEnum.FOLDER_NAME_ALREADY_REGISTERED);
    }

    const updatedFolder = await this.folderRepository.updateById(input.id, {
      name: input.name,
    });
    this.logger.log('[UpdateFolderUseCase] Execute finished');


    return {
      id: updatedFolder.id,
      name: updatedFolder.name,
      userId: updatedFolder.userId,
      folderId: updatedFolder.folderId,
      createdAt: updatedFolder.createdAt,
      updatedAt: updatedFolder.updatedAt,
    };
  }
}



