import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { FileRepository } from '../../repositories/FileRepository';
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';

export type GetFileByIdInput = {
  id: string;
  requesterUserId: string;
  requesterRole: ROLE;
};

export type GetFileByIdOutput = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  extension: string;
  url: string;
  folder: {
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
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class GetFileByIdUseCase {
  constructor(private readonly fileRepository: FileRepository) {}

  async execute(input: GetFileByIdInput): Promise<GetFileByIdOutput> {
    const file = await this.fileRepository.findById(input.id);

    if (!file || file.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND);
    }

    if (input.requesterRole !== ROLE.ADMIN && file.userId !== input.requesterUserId) {
      throw new ForbiddenException(ErrorMessagesEnum.FILE_ACCESS_FORBIDDEN);
    }

    return {
      id: file.id,
      name: file.name,
      userId: file.userId,
      folderId: file.folderId,
      extension: file.extension,
      url: file.url,
      folder: file.folder
        ? {
            id: file.folder.id,
            name: file.folder.name,
            userId: file.folder.userId,
            folderId: file.folder.folderId,
            parent: file.folder.parent
              ? {
                  id: file.folder.parent.id,
                  name: file.folder.parent.name,
                  userId: file.folder.parent.userId,
                  folderId: file.folder.parent.folderId,
                }
              : null,
            children: file.folder.children.map((child) => ({
              id: child.id,
              name: child.name,
              userId: child.userId,
              folderId: child.folderId,
            })),
          }
        : null,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}
