import { Injectable, NotFoundException } from '@nestjs/common';
import { FileRepository } from '../../repositories/FileRepository';
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';

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
  constructor(private readonly fileRepository: FileRepository) {}

  async execute(input: SoftDeleteFileInput): Promise<SoftDeleteFileOutput> {
    const existingFile = await this.fileRepository.findById(input.id);

    if (!existingFile || existingFile.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND);
    }

    const deletedAt = new Date();
    const deletedFile = await this.fileRepository.softDeleteById(
      input.id,
      deletedAt,
    );

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
