import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FileRepository } from '../../repositories/FileRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

export type SoftDeleteFileInput = {
  id: string;
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
  constructor(private readonly fileRepository: FileRepository) {}

  async execute(input: SoftDeleteFileInput): Promise<SoftDeleteFileOutput> {
    this.logger.log('[SoftDeleteFileUseCase] Execute started');
    const existingFile = await this.fileRepository.findById(input.id);

    if (!existingFile || existingFile.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND);
    }

    const deletedAt = new Date();
    const deletedFile = await this.fileRepository.softDeleteById(
      input.id,
      deletedAt,
    );
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



