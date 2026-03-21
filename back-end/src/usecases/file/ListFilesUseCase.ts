import { Injectable } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { FileRepository } from '../../repositories/FileRepository';

export type ListFilesOutput = Array<{
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  extension: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}>;

@Injectable()
export class ListFilesUseCase {
  constructor(private readonly fileRepository: FileRepository) {}

  async execute(input: {
    requesterUserId: string;
    requesterRole: ROLE;
  }): Promise<ListFilesOutput> {
    const files = await this.fileRepository.findAll();

    return files
      .filter((file) => {
        if (file.deletedAt) {
          return false;
        }

        if (input.requesterRole === ROLE.ADMIN) {
          return true;
        }

        return file.userId === input.requesterUserId;
      })
      .map((file) => ({
        id: file.id,
        name: file.name,
        userId: file.userId,
        folderId: file.folderId,
        extension: file.extension,
        url: file.url,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      }));
  }
}
