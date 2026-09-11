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
    organizationId: string;
    name: string;
    userId: string;
    folderId?: string;
    isDefault?: boolean;
  }): Promise<Folder> {
    return this.prisma.folder.create({
      data,
    });
  }

  /**
   * `findFirst`, e nao `findUnique`: e o que permite somar o predicado de
   * organizacao ao id. Devolve `null` para pasta de outra organizacao, o que
   * faz o NotFoundException que os use cases ja lancam cobrir o caso cross-org.
   */
  findById(
    organizationId: string,
    id: string,
  ): Promise<FolderWithRelations | null> {
    return this.prisma.folder.findFirst({
      where: { id, organizationId },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  /**
   * Sem o recorte de organizacao aqui o vazamento seria por MENSAGEM DE ERRO:
   * criar uma pasta com um nome que existe em outra organizacao devolveria
   * 409 FOLDER_NAME_ALREADY_REGISTERED, revelando nomes alheios a quem so
   * tentou criar uma pasta.
   */
  findActiveByUserIdAndName(input: {
    organizationId: string;
    userId: string;
    name: string;
    excludeId?: string;
  }): Promise<Folder | null> {
    return this.prisma.folder.findFirst({
      where: {
        organizationId: input.organizationId,
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

  /**
   * Escrita por chave primaria: `update` exige `where` unique. A leitura que
   * precede esta escrita e a recortada (`findById`) -- ver a nota equivalente
   * em UserRepository.updateById.
   */
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
   *
   * `organizationId` entra nos DOIS `where`, inclusive no de `file`, cujo
   * predicado e por `folderId`. Os ids ja chegam seguros da travessia, que usa
   * o `findById` recortado -- mas numa mutacao em massa a defesa em
   * profundidade custa uma palavra.
   */
  softDeleteSubtree(
    organizationId: string,
    folderIds: string[],
    deletedAt: Date,
  ): Promise<[{ count: number }, { count: number }]> {
    return this.prisma.$transaction([
      this.prisma.folder.updateMany({
        where: { organizationId, id: { in: folderIds }, deletedAt: null },
        data: { deletedAt },
      }),
      this.prisma.file.updateMany({
        where: {
          organizationId,
          folderId: { in: folderIds },
          deletedAt: null,
        },
        data: { deletedAt },
      }),
    ]);
  }

  listFoldersActive(input: {
    organizationId: string;
    requesterUserId: string;
    requesterRole: ROLE;
    folderId?: string;
    rootsOnly?: boolean;
    skip?: number;
    take?: number;
  }): Promise<FolderWithRelations[]> {
    return this.prisma.folder.findMany({
      where: {
        // Incondicional, fora de qualquer spread: o recorte de organizacao nao
        // depende de papel. O ternario abaixo passa a significar "ADMIN ve
        // tudo DENTRO da organizacao", e nao mais "ADMIN ve tudo".
        organizationId: input.organizationId,
        deletedAt: null,
        ...(input.requesterRole === ROLE.USER
          ? { userId: input.requesterUserId }
          : {}),
        ...(input.folderId ? { folderId: input.folderId } : {}),
        ...(input.rootsOnly ? { folderId: null } : {}),
      },
      include: {
        parent: true,
        children: true,
      },
      orderBy: { name: 'asc' },
      skip: input.skip,
      take: input.take,
    });
  }

  countFoldersActive(input: {
    organizationId: string;
    requesterUserId: string;
    requesterRole: ROLE;
    folderId?: string;
    rootsOnly?: boolean;
  }): Promise<number> {
    return this.prisma.folder.count({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        ...(input.requesterRole === ROLE.USER
          ? { userId: input.requesterUserId }
          : {}),
        ...(input.folderId ? { folderId: input.folderId } : {}),
        ...(input.rootsOnly ? { folderId: null } : {}),
      },
    });
  }
}
