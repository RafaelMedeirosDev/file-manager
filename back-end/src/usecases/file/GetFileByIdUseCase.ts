import { ForbiddenException,
  Injectable,
  NotFoundException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(GetFileByIdUseCase.name);
  constructor(private readonly fileRepository: FileRepository) {}

  async execute(input: GetFileByIdInput): Promise<GetFileByIdOutput> {
    this.logger.log('[GetFileByIdUseCase] Execute started');
    const file = await this.fileRepository.findById(input.id);

    if (!file || file.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND);
    }

    if (!this.canAccessResource(file.userId, input)) {
      throw new ForbiddenException(ErrorMessagesEnum.FILE_ACCESS_FORBIDDEN);
    }
    this.logger.log('[GetFileByIdUseCase] Execute finished');


    return {
      id: file.id,
      name: file.name,
      userId: file.userId,
      folderId: file.folderId,
      extension: file.extension,
      url: file.url,
      folder:
        file.folder &&
        !file.folder.deletedAt &&
        this.canAccessResource(file.folder.userId, input)
          ? {
              id: file.folder.id,
              name: file.folder.name,
              userId: file.folder.userId,
              folderId: file.folder.folderId,
              parent:
                file.folder.parent &&
                !file.folder.parent.deletedAt &&
                this.canAccessResource(file.folder.parent.userId, input)
                  ? {
                      id: file.folder.parent.id,
                      name: file.folder.parent.name,
                      userId: file.folder.parent.userId,
                      folderId: file.folder.parent.folderId,
                    }
                  : null,
              children: file.folder.children
                .filter(
                  (child) =>
                    !child.deletedAt && this.canAccessResource(child.userId, input),
                )
                .map((child) => ({
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

  private canAccessResource(
    ownerUserId: string,
    input: { requesterUserId: string; requesterRole: ROLE },
  ): boolean {
    if (input.requesterRole === ROLE.ADMIN) {
      return true;
    }

    return ownerUserId === input.requesterUserId;
  }
}



