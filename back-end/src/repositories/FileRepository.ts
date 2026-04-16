import { Injectable } from '@nestjs/common';
import { File, Prisma, ROLE } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type FileWithFolderRelations = Prisma.FileGetPayload<{
  include: {
    folder: {
      include: {
        parent: true;
        children: true;
      };
    };
  };
}>;

@Injectable()
export class FileRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    name: string;
    userId: string;
    folderId: string;
    extension: string;
    url: string;
  }): Promise<File> {
    return this.prisma.file.create({
      data,
    });
  }

  findAll(): Promise<File[]> {
    return this.prisma.file.findMany();
  }

  listFilesActive(requestUserId: string, requestRole: ROLE, folderId?: string, skip?: number, take?: number): Promise<File[]> {
    return this.prisma.file.findMany({
      where: {
        deletedAt: null,
        ...(requestRole === ROLE.USER ? { userId: requestUserId } : {}),
        ...(folderId ? { folderId } : {}),
      },
      orderBy: { name: 'asc' },
      skip,
      take,
    });
  }

  countFilesActive(requestUserId: string, requestRole: ROLE, folderId?: string): Promise<number> {
    return this.prisma.file.count({
      where: {
        deletedAt: null,
        ...(requestRole === ROLE.USER ? { userId: requestUserId } : {}),
        ...(folderId ? { folderId } : {}),
      },
    });
  }

  findById(id: string): Promise<FileWithFolderRelations | null> {
    return this.prisma.file.findUnique({
      where: { id },
      include: {
        folder: {
          include: {
            parent: true,
            children: true,
          },
        },
      },
    });
  }

  updateById(
    id: string,
    data: {
      folderId?: string;
      url?: string;
    },
  ): Promise<File> {
    return this.prisma.file.update({
      where: { id },
      data,
    });
  }

  softDeleteById(id: string, deletedAt: Date): Promise<File> {
    return this.prisma.file.update({
      where: { id },
      data: { deletedAt },
    });
  }
}
