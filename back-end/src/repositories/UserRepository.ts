import { Injectable } from '@nestjs/common';
import { Folder, ROLE, User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    name: string;
    email: string;
    password: string;
    role: ROLE;
  }): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  /**
   * Cria o usuario e suas pastas numa unica transacao.
   *
   * Antes eram 1 + 1 + N escritas em autocommits separados, e uma falha no
   * meio deixava o usuario criado com o conjunto de pastas truncado -- sem
   * possibilidade de retry, porque a segunda tentativa esbarrava no e-mail ja
   * gravado.
   *
   * A forma interativa e obrigatoria aqui: as pastas dependem do id do usuario,
   * que so existe depois do primeiro insert. Escreve em `folders` porque e o
   * proposito do metodo -- transacao multi-tabela nao cabe num repositorio so.
   *
   * Sem regra de negocio: a deduplicacao dos nomes e a escolha da pasta padrao
   * ficam no use case. Aqui e apenas escrita.
   */
  createWithFolders(input: {
    user: { name: string; email: string; password: string; role: ROLE };
    defaultFolderName: string;
    extraFolderNames: string[];
  }): Promise<{ user: User; folders: Folder[] }> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: input.user });

      // createMany nao devolve as linhas criadas, e o chamador precisa dos ids.
      const folders = await Promise.all([
        tx.folder.create({
          data: {
            name: input.defaultFolderName,
            userId: user.id,
            isDefault: true,
          },
        }),
        ...input.extraFolderNames.map((name) =>
          tx.folder.create({ data: { name, userId: user.id } }),
        ),
      ]);

      return { user, folders };
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  listUsersActive(
    search?: string,
    skip?: number,
    take?: number,
  ): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      skip,
      take,
    });
  }

  countActiveUsers(search?: string): Promise<number> {
    return this.prisma.user.count({
      where: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
    });
  }

  updateById(
    id: string,
    data: {
      email?: string;
      password?: string;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  softDeleteById(id: string, deletedAt: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt },
    });
  }
}
