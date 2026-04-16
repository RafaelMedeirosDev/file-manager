import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { FolderRepository } from '../../repositories/FolderRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

export type ListFoldersOutput = {
  data: Array<{
    id: string;
    name: string;
    userId: string;
    folderId: string | null;
    parent: {
      id: string;
      name: string;
      userId: string;
      folderId: string | null;
    } | null;
    children: Array<{
      id: string;
      name: string;
      userId: string;
      folderId: string | null;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
};

@Injectable()
export class ListFoldersUseCase {
  private readonly logger = new Logger(ListFoldersUseCase.name);

  constructor(private readonly folderRepository: FolderRepository) {}

  async execute(input: {
    requesterUserId: string;
    requesterRole: ROLE;
    folderId?: string;
    rootsOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ListFoldersOutput> {
    this.logger.log('[ListFoldersUseCase] Execute started');

    if (input.folderId && input.rootsOnly) {
      throw new BadRequestException(ErrorMessagesEnum.INVALID_FOLDER_LIST_FILTER);
    }

    const page = input.page ?? 1;
    const limit = input.limit ?? 10;
    const skip = (page - 1) * limit;

    const folders = await this.folderRepository.listFoldersActive(
      input.requesterUserId,
      input.requesterRole,
      input.folderId,
      input.rootsOnly,
      skip,
      limit,
    );
    const totalFolders = await this.folderRepository.countFoldersActive(
      input.requesterUserId,
      input.requesterRole,
      input.folderId,
      input.rootsOnly,
    );

    this.logger.log('[ListFoldersUseCase] Execute finished');

    return {
      data: folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        userId: folder.userId,
        folderId: folder.folderId,
        parent: folder.parent && !folder.parent.deletedAt
          ? {
              id: folder.parent.id,
              name: folder.parent.name,
              userId: folder.parent.userId,
              folderId: folder.parent.folderId,
            }
          : null,
        children: folder.children
          .filter((child) => !child.deletedAt)
          .map((child) => ({
            id: child.id,
            name: child.name,
            userId: child.userId,
            folderId: child.folderId,
          })),
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      })),
      meta: {
        page,
        limit,
        total: totalFolders,
        hasNextPage: totalFolders > skip + limit,
      },
    };
  }
}
