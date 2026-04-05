import { ForbiddenException,
  Injectable,
  NotFoundException, Logger } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { FileRepository } from '../../repositories/FileRepository';
import { FolderRepository } from '../../repositories/FolderRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

export type GetFolderByIdInput = {
  id: string;
  requesterUserId: string;
  requesterRole: ROLE;
};

export type GetFolderByIdOutput = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  ancestors: Array<{ id: string; name: string }>;
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
  files: Array<{
    id: string;
    name: string;
    userId: string;
    folderId: string | null;
    extension: string;
    url: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class GetFolderByIdUseCase {
  private readonly logger = new Logger(GetFolderByIdUseCase.name);
  constructor(
    private readonly folderRepository: FolderRepository,
    private readonly fileRepository: FileRepository,
  ) {}

  async execute(input: GetFolderByIdInput): Promise<GetFolderByIdOutput> {
    this.logger.log('[GetFolderByIdUseCase] Execute started');
    const folder = await this.folderRepository.findById(input.id);

    if (!folder || folder.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND);
    }

    if (!this.canAccessFolder(folder.userId, input)) {
      throw new ForbiddenException(ErrorMessagesEnum.FOLDER_ACCESS_FORBIDDEN);
    }

    const files = await this.fileRepository.findAll();

    // ── Ancestors: sobe a hierarquia até a raiz ──────────
    const ancestors: Array<{ id: string; name: string }> = [];
    let currentParentId = folder.folderId;

    while (currentParentId) {
      const ancestor = await this.folderRepository.findById(currentParentId);
      if (!ancestor || ancestor.deletedAt) break;
      ancestors.unshift({ id: ancestor.id, name: ancestor.name });
      currentParentId = ancestor.folderId;
    }

    this.logger.log('[GetFolderByIdUseCase] Execute finished');

    return {
      id: folder.id,
      name: folder.name,
      userId: folder.userId,
      folderId: folder.folderId,
      ancestors,
      parent:
        folder.parent &&
        !folder.parent.deletedAt &&
        this.canAccessFolder(folder.parent.userId, input)
          ? {
              id: folder.parent.id,
              name: folder.parent.name,
              userId: folder.parent.userId,
              folderId: folder.parent.folderId,
            }
          : null,
      children: folder.children
        .filter(
          (child) =>
            !child.deletedAt && this.canAccessFolder(child.userId, input),
        )
        .map((child) => ({
          id: child.id,
          name: child.name,
          userId: child.userId,
          folderId: child.folderId,
        })),
      files: files
        .filter(
          (file) =>
            file.folderId === folder.id &&
            !file.deletedAt &&
            this.canAccessFolder(file.userId, input),
        )
        .map((file) => ({
          id: file.id,
          name: file.name,
          userId: file.userId,
          folderId: file.folderId,
          extension: file.extension,
          url: file.url,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        })),
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }

  private canAccessFolder(
    ownerUserId: string,
    input: { requesterUserId: string; requesterRole: ROLE },
  ): boolean {
    if (input.requesterRole === ROLE.ADMIN) {
      return true;
    }

    return ownerUserId === input.requesterUserId;
  }
}



