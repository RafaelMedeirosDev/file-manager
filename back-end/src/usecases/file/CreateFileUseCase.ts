import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FileRepository } from '../../repositories/FileRepository';
import { FolderRepository } from '../../repositories/FolderRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';

export type CreateFileInput = {
  name: string;
  userId: string;
  folderId: string;
  extension: string;
  url: string;
};

export type CreateFileOutput = {
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
export class CreateFileUseCase {
  private readonly logger = new Logger(CreateFileUseCase.name);
  constructor(
    private readonly userRepository: UserRepository,
    private readonly folderRepository: FolderRepository,
    private readonly fileRepository: FileRepository,
  ) {}

  async execute(input: CreateFileInput): Promise<CreateFileOutput> {
    this.logger.log('[CreateFileUseCase] Execute started');
    const user = await this.userRepository.findById(input.userId);

    if (!user || user.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND);
    }

    const folder = await this.folderRepository.findById(input.folderId);

    if (!folder || folder.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND);
    }

    if (folder.userId !== input.userId) {
      throw new BadRequestException(
        ErrorMessagesEnum.FOLDER_DOES_NOT_BELONG_TO_USER,
      );
    }

    const file = await this.fileRepository.create({
      name: input.name,
      userId: input.userId,
      folderId: input.folderId,
      extension: input.extension,
      url: input.url,
    });
    this.logger.log('[CreateFileUseCase] Execute finished');


    return {
      id: file.id,
      name: file.name,
      userId: file.userId,
      folderId: file.folderId,
      extension: file.extension,
      url: file.url,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}



