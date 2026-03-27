import { BadRequestException,
  Injectable,
  NotFoundException, Logger } from '@nestjs/common';
import { FileRepository } from '../../repositories/FileRepository';
import { FolderRepository } from '../../repositories/FolderRepository';
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';

export type UpdateFileInput = {
  id: string;
  folderId?: string;
  url?: string;
};

export type UpdateFileOutput = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  extension: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UpdateFileUseCase {
  private readonly logger = new Logger(UpdateFileUseCase.name);
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly folderRepository: FolderRepository,
  ) {}

  async execute(input: UpdateFileInput): Promise<UpdateFileOutput> {
    this.logger.log('[UpdateFileUseCase] Execute started');
    if (!input.folderId && !input.url) {
      throw new BadRequestException(ErrorMessagesEnum.AT_LEAST_ONE_FIELD_REQUIRED);
    }

    const file = await this.fileRepository.findById(input.id);

    if (!file || file.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND);
    }

    if (input.folderId) {
      const folder = await this.folderRepository.findById(input.folderId);

      if (!folder || folder.deletedAt) {
        throw new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND);
      }

      if (folder.userId !== file.userId) {
        throw new BadRequestException(
          ErrorMessagesEnum.FOLDER_DOES_NOT_BELONG_TO_USER,
        );
      }
    }

    const updatedFile = await this.fileRepository.updateById(input.id, {
      folderId: input.folderId,
      url: input.url,
    });
    this.logger.log('[UpdateFileUseCase] Execute finished');


    return {
      id: updatedFile.id,
      name: updatedFile.name,
      userId: updatedFile.userId,
      folderId: updatedFile.folderId,
      extension: updatedFile.extension,
      url: updatedFile.url,
      createdAt: updatedFile.createdAt,
      updatedAt: updatedFile.updatedAt,
    };
  }
}



