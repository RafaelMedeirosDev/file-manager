import { Injectable } from '@nestjs/common';
import { Folder, Prisma, ROLE } from '@prisma/client';
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
    isDefault?: boolean;
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

  findActiveByUserIdAndName(input: {
    userId: string;
    name: string;
    excludeId?: string;
  }): Promise<Folder | null> {
    return this.prisma.folder.findFirst({
      where: {
        userId: input.userId,
        name: input.name,
        deletedAt: null,
        ...(input.excludeId
          ? {
              NOT: {
                id: input.excludeId,
              },
            }
          : {}),
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

  /**
   * Marca como excluidas as pastas informadas e os arquivos dentro delas, numa
   * unica transacao.
   *
   * Antes o soft delete atingia so a pasta pedida: subpastas e arquivos
   * continuavam ativos e listaveis por `?folderId=<pasta excluida>`, porque as
   * listagens filtram deletedAt da propria linha e nunca do ancestral.
   *
   * A forma em array e suficiente: os ids chegam prontos do use case, que faz a
   * travessia da subarvore, e os dois updateMany sao independentes entre si --
   * nao ha valor a reaproveitar de um no outro.
   */
  softDeleteSubtree(
    folderIds: string[],
    deletedAt: Date,
  ): Promise<[{ count: number }, { count: number }]> {
    return this.prisma.$transaction([
      this.prisma.folder.updateMany({
        where: { id: { in: folderIds }, deletedAt: null },
        data: { deletedAt },
      }),
      this.prisma.file.updateMany({
        where: { folderId: { in: folderIds }, deletedAt: null },
        data: { deletedAt },
      }),
    ]);
  }

  listFoldersActive(
    requestUserId: string,
    requestRole: ROLE,
    folderId?: string,
    rootsOnly?: boolean,
    skip?: number,
    take?: number,
  ): Promise<FolderWithRelations[]> {
    return this.prisma.folder.findMany({
      where: {
        deletedAt: null,
        ...(requestRole === ROLE.USER ? { userId: requestUserId } : {}),
        ...(folderId ? { folderId } : {}),
        ...(rootsOnly ? { folderId: null } : {}),
      },
      include: {
        parent: true,
        children: true,
      },
      orderBy: { name: 'asc' },
      skip,
      take,
    });
  }

  countFoldersActive(
    requestUserId: string,
    requestRole: ROLE,
    folderId?: string,
    rootsOnly?: boolean,
  ): Promise<number> {
    return this.prisma.folder.count({
      where: {
        deletedAt: null,
        ...(requestRole === ROLE.USER ? { userId: requestUserId } : {}),
        ...(folderId ? { folderId } : {}),
        ...(rootsOnly ? { folderId: null } : {}),
      },
    });
  }
}
