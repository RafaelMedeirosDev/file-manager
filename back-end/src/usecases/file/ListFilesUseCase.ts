import { Injectable, Logger } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { FileRepository } from '../../repositories/FileRepository';

export type ListFilesOutput = {
  data: Array<{
    id: string;
    name: string;
    userId: string;
    folderId: string | null;
    extension: string;
    url: string;
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
export class ListFilesUseCase {
  private readonly logger = new Logger(ListFilesUseCase.name);

  constructor(private readonly fileRepository: FileRepository) {}

  async execute(input: {
    requesterUserId: string;
    requesterRole: ROLE;
    folderId?: string;
    page?: number;
    limit?: number;
  }): Promise<ListFilesOutput> {
    this.logger.log('[ListFilesUseCase] Execute started');

    const page = input.page ?? 1;
    const limit = input.limit ?? 10;
    const skip = (page - 1) * limit;

    const files = await this.fileRepository.listFilesActive(
      input.requesterUserId,
      input.requesterRole,
      input.folderId,
      skip,
      limit,
    );
    const totalFiles = await this.fileRepository.countFilesActive(
      input.requesterUserId,
      input.requesterRole,
      input.folderId,
    );

    this.logger.log('[ListFilesUseCase] Execute finished');

    return {
      data: files.map((file) => ({
        id: file.id,
        name: file.name,
        userId: file.userId,
        folderId: file.folderId,
        extension: file.extension,
        url: file.url,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      })),
      meta: {
        page,
        limit,
        total: totalFiles,
        hasNextPage: totalFiles > skip + limit,
      },
    };
  }
}
