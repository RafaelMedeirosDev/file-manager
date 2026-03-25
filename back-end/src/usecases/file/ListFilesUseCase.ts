import { Injectable } from '@nestjs/common';
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
  constructor(private readonly fileRepository: FileRepository) {}

  async execute(input: {
    requesterUserId: string;
    requesterRole: ROLE;
    folderId?: string;
    page?: number;
    limit?: number;
  }): Promise<ListFilesOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 10;

    const files = await this.fileRepository.findAll();

    const filteredFiles = files.filter((file) => {
      if (file.deletedAt) {
        return false;
      }

      if (input.folderId && file.folderId !== input.folderId) {
        return false;
      }

      if (input.requesterRole === ROLE.ADMIN) {
        return true;
      }

      return file.userId === input.requesterUserId;
    });

    const sortedFiles = [...filteredFiles].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
    );

    const total = sortedFiles.length;
    const start = (page - 1) * limit;
    const paginatedFiles = sortedFiles.slice(start, start + limit);

    return {
      data: paginatedFiles.map((file) => ({
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
        total,
        hasNextPage: start + limit < total,
      },
    };
  }
}
