import { Injectable } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { FolderRepository } from '../../repositories/FolderRepository';

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
  }): Promise<ListFoldersOutput> {
    const folders = await this.folderRepository.findAll();

    return folders
      .filter((folder) => {
        if (folder.deletedAt) {
          return false;
        }

        if (input.requesterRole === ROLE.ADMIN) {
          return true;
        }

        return folder.userId === input.requesterUserId;
      })
      .map((folder) => ({
        id: folder.id,
        name: folder.name,
        userId: folder.userId,
        folderId: folder.folderId,
        parent: folder.parent
          ? {
              id: folder.parent.id,
              name: folder.parent.name,
              userId: folder.parent.userId,
              folderId: folder.parent.folderId,
            }
          : null,
        children: folder.children.map((child) => ({
          id: child.id,
          name: child.name,
          userId: child.userId,
          folderId: child.folderId,
        })),
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      }));
  }
}
