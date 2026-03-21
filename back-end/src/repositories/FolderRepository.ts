import { Injectable } from '@nestjs/common';
import { Folder, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type FolderWithRelations = Prisma.FolderGetPayload<{
  include: {
    parent: true;
    children: true;
  };
}>;

@Injectable()
export class FolderRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    name: string;
    userId: string;
    folderId?: string;
  }): Promise<Folder> {
    return this.prisma.folder.create({
      data,
    });
  }

  findById(id: string): Promise<FolderWithRelations | null> {
    return this.prisma.folder.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  findAll(): Promise<FolderWithRelations[]> {
    return this.prisma.folder.findMany({
      include: {
        parent: true,
        children: true,
      },
    });
  }

  updateById(
    id: string,
    data: {
      name: string;
    },
  ): Promise<Folder> {
    return this.prisma.folder.update({
      where: { id },
      data,
    });
  }

  softDeleteById(id: string, deletedAt: Date): Promise<Folder> {
    return this.prisma.folder.update({
      where: { id },
      data: { deletedAt },
    });
  }
}
