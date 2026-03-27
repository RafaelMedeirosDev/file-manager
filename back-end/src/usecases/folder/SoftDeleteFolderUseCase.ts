import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FolderRepository } from '../../repositories/FolderRepository';
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';

export type SoftDeleteFolderInput = {
  id: string;
};

export type SoftDeleteFolderOutput = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  deletedAt: string;
};

@Injectable()
export class SoftDeleteFolderUseCase {
  private readonly logger = new Logger(SoftDeleteFolderUseCase.name);
  constructor(private readonly folderRepository: FolderRepository) {}

  async execute(input: SoftDeleteFolderInput): Promise<SoftDeleteFolderOutput> {
    this.logger.log('[SoftDeleteFolderUseCase] Execute started');
    const existingFolder = await this.folderRepository.findById(input.id);

    if (!existingFolder || existingFolder.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND);
    }

    const deletedAt = new Date();
    const deletedFolder = await this.folderRepository.softDeleteById(
      input.id,
      deletedAt,
    );
    this.logger.log('[SoftDeleteFolderUseCase] Execute finished');


    return {
      id: deletedFolder.id,
      name: deletedFolder.name,
      userId: deletedFolder.userId,
      folderId: deletedFolder.folderId,
      deletedAt: deletedAt.toISOString(),
    };
  }
}



