import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { FolderRepository } from '../../repositories/FolderRepository';
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';

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

    const folders = await this.folderRepository.findAll();

    const filteredFolders = folders.filter((folder) => {
      if (!this.canAccessFolder(folder.userId, folder.deletedAt, input)) {
        return false;
      }

      if (input.folderId) {
        return folder.folderId === input.folderId;
      }

      if (input.rootsOnly) {
        return folder.folderId === null;
      }

      return true;
    });

    const sortedFolders = [...filteredFolders].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
    );

    const total = sortedFolders.length;
    const start = (page - 1) * limit;
    const paginatedFolders = sortedFolders.slice(start, start + limit);

    this.logger.log('[ListFoldersUseCase] Execute finished');

    return {
      data: paginatedFolders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        userId: folder.userId,
        folderId: folder.folderId,
        parent:
          folder.parent &&
          this.canAccessFolder(folder.parent.userId, folder.parent.deletedAt, input)
            ? {
                id: folder.parent.id,
                name: folder.parent.name,
                userId: folder.parent.userId,
                folderId: folder.parent.folderId,
              }
            : null,
        children: folder.children
          .filter((child) =>
            this.canAccessFolder(child.userId, child.deletedAt, input),
          )
          .sort((a, b) =>
            a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
          )
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
        total,
        hasNextPage: start + limit < total,
      },
    };
  }

  private canAccessFolder(
    ownerUserId: string,
    deletedAt: Date | null,
    input: {
      requesterUserId: string;
      requesterRole: ROLE;
    },
  ): boolean {
    if (deletedAt) {
      return false;
    }

    if (input.requesterRole === ROLE.ADMIN) {
      return true;
    }

    return ownerUserId === input.requesterUserId;
  }
}
