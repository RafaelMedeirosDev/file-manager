import { Injectable, NotFoundException } from '@nestjs/common';
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
  constructor(private readonly folderRepository: FolderRepository) {}

  async execute(input: UpdateFolderInput): Promise<UpdateFolderOutput> {
    const existingFolder = await this.folderRepository.findById(input.id);

    if (!existingFolder || existingFolder.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND);
    }

    const updatedFolder = await this.folderRepository.updateById(input.id, {
      name: input.name,
    });

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
