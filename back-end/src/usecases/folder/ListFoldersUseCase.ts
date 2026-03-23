import { BadRequestException, Injectable } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { FolderRepository } from '../../repositories/FolderRepository';
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';

export type ListFoldersOutput = Array<{
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

@Injectable()
export class ListFoldersUseCase {
  constructor(private readonly folderRepository: FolderRepository) {}

  async execute(input: {
    requesterUserId: string;
    requesterRole: ROLE;
    folderId?: string;
    rootsOnly?: boolean;
  }): Promise<ListFoldersOutput> {
    if (input.folderId && input.rootsOnly) {
      throw new BadRequestException(ErrorMessagesEnum.INVALID_FOLDER_LIST_FILTER);
    }

    const folders = await this.folderRepository.findAll();

    return folders
      .filter((folder) => {
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
      })
      .map((folder) => ({
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
          .filter((child) => this.canAccessFolder(child.userId, child.deletedAt, input))
          .map((child) => ({
            id: child.id,
            name: child.name,
            userId: child.userId,
            folderId: child.folderId,
          })),
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      }));
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
