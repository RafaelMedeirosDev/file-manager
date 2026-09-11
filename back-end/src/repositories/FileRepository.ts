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
    organizationId: string;
    name: string;
    userId: string;
    folderId: string;
    extension: string;
    key: string;
  }): Promise<File> {
    return this.prisma.file.create({
      data,
    });
  }

  listFilesActive(input: {
    organizationId: string;
    requesterUserId: string;
    requesterRole: ROLE;
    folderId?: string;
    skip?: number;
    take?: number;
  }): Promise<File[]> {
    return this.prisma.file.findMany({
      where: {
        // Incondicional: o recorte de organizacao nao depende de papel.
        organizationId: input.organizationId,
        deletedAt: null,
        ...(input.requesterRole === ROLE.USER
          ? { userId: input.requesterUserId }
          : {}),
        ...(input.folderId ? { folderId: input.folderId } : {}),
      },
      orderBy: { name: 'asc' },
      skip: input.skip,
      take: input.take,
    });
  }

  countFilesActive(input: {
    organizationId: string;
    requesterUserId: string;
    requesterRole: ROLE;
    folderId?: string;
  }): Promise<number> {
    return this.prisma.file.count({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        ...(input.requesterRole === ROLE.USER
          ? { userId: input.requesterUserId }
          : {}),
        ...(input.folderId ? { folderId: input.folderId } : {}),
      },
    });
  }

  /**
   * `findFirst`, e nao `findUnique`: e o que permite somar o predicado de
   * organizacao ao id.
   */
  findById(
    organizationId: string,
    id: string,
  ): Promise<FileWithFolderRelations | null> {
    return this.prisma.file.findFirst({
      where: { id, organizationId },
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

  /**
   * Escrita por chave primaria: `update` exige `where` unique. A leitura que
   * precede esta escrita e a recortada (`findById`) -- ver a nota equivalente
   * em UserRepository.updateById.
   */
  updateById(
    id: string,
    data: {
      folderId?: string;
    },
  ): Promise<File> {
    return this.prisma.file.update({
      where: { id },
      data,
    });
  }

  /** Escrita por chave primaria -- mesma nota de updateById. */
  softDeleteById(id: string, deletedAt: Date): Promise<File> {
    return this.prisma.file.update({
      where: { id },
      data: { deletedAt },
    });
  }
}
