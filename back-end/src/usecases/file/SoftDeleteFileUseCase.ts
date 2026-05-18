import { ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { FileRepository } from '../../repositories/FileRepository';
import { FolderRepository } from '../../repositories/FolderRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

export type SoftDeleteFileInput = {
  id: string;
  requesterUserId: string;
  requesterRole: ROLE;
};

export type SoftDeleteFileOutput = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  url: string;
  deletedAt: string;
};

@Injectable()
export class SoftDeleteFileUseCase {
  private readonly logger = new Logger(SoftDeleteFileUseCase.name);

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly folderRepository: FolderRepository,
  ) {}

  async execute(input: SoftDeleteFileInput): Promise<SoftDeleteFileOutput> {
    this.logger.log('[SoftDeleteFileUseCase] Execute started');

    const file = await this.fileRepository.findById(input.id);

    if (!file || file.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND);
    }

    const isAdmin = input.requesterRole === ROLE.ADMIN;

    if (!isAdmin) {
      if (file.userId !== input.requesterUserId) {
        throw new ForbiddenException(ErrorMessagesEnum.FILE_ACCESS_FORBIDDEN);
      }

      const folder = file.folderId
        ? await this.folderRepository.findById(file.folderId)
        : null;

      if (!folder?.isDefault) {
        throw new ForbiddenException(ErrorMessagesEnum.FILE_ACCESS_FORBIDDEN);
      }
    }

    const deletedAt = new Date();
    const deletedFile = await this.fileRepository.softDeleteById(input.id, deletedAt);

    this.logger.log('[SoftDeleteFileUseCase] Execute finished');

    return {
      id: deletedFile.id,
      name: deletedFile.name,
      userId: deletedFile.userId,
      folderId: deletedFile.folderId,
      url: deletedFile.url,
      deletedAt: deletedAt.toISOString(),
    };
  }
}
