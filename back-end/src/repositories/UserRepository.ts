import { Injectable } from '@nestjs/common';
import { Folder, ROLE, User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria o usuario, sua associacao com a organizacao e suas pastas numa unica
   * transacao.
   *
   * Antes eram 1 + 1 + N escritas em autocommits separados, e uma falha no
   * meio deixava o usuario criado com o conjunto de pastas truncado -- sem
   * possibilidade de retry, porque a segunda tentativa esbarrava no e-mail ja
   * gravado.
   *
   * A forma interativa e obrigatoria aqui: a associacao e as pastas dependem
   * do id do usuario, que so existe depois do primeiro insert. Escreve em
   * `memberships` e `folders` porque e o proposito do metodo -- transacao
   * multi-tabela nao cabe num repositorio so.
   *
   * `role` e gravado nos dois lugares durante o expand: em `users.role`, que
   * sera dropada no contract, e em `memberships.role`, que e de onde o papel
   * passa a ser lido.
   *
   * Sem regra de negocio: a deduplicacao dos nomes e a escolha da pasta padrao
   * ficam no use case. Aqui e apenas escrita.
   */
  createWithFolders(input: {
    organizationId: string;
    user: { name: string; email: string; password: string; role: ROLE };
    defaultFolderName: string;
    extraFolderNames: string[];
  }): Promise<{ user: User; folders: Folder[] }> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: input.user });

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: input.organizationId,
          role: input.user.role,
        },
      });

      // createMany nao devolve as linhas criadas, e o chamador precisa dos ids.
      const folders = await Promise.all([
        tx.folder.create({
          data: {
            name: input.defaultFolderName,
            organizationId: input.organizationId,
            userId: user.id,
            isDefault: true,
          },
        }),
        ...input.extraFolderNames.map((name) =>
          tx.folder.create({
            data: {
              name,
              organizationId: input.organizationId,
              userId: user.id,
            },
          }),
        ),
      ]);

      return { user, folders };
    });
  }

  /**
   * Busca global por e-mail, sem recorte de organizacao nem de deletedAt.
   *
   * Intencional, e a unica forma que funciona: `users.email` e unique global
   * -- e justamente isso que permite a mesma pessoa pertencer a duas
   * organizacoes --, e o passo 1 do login precisa resolver o e-mail ANTES de
   * qualquer organizacao ser conhecida. Filtrar deletedAt aqui criaria a mesma
   * divergencia que o comentario de ExamRepository.findByCode descreve.
   *
   * Chamadores: o login, e as duas guardas de e-mail duplicado.
   */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email },
    });
  }

  /**
   * Busca por id recortada por organizacao. **E a que todo codigo de negocio
   * deve usar** -- por isso ela fica com o nome curto.
   *
   * `users` nao tem coluna de organizacao -- a identidade e global --, entao o
   * recorte e pela associacao. Devolve `null` para um usuario que existe mas
   * nao pertence a organizacao, o que faz o `NotFoundException` que os use
   * cases ja lancam cobrir tambem o caso cross-org, sem branch novo.
   */
  findById(organizationId: string, id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        memberships: { some: { organizationId, deletedAt: null } },
      },
    });
  }

  /**
   * Busca global, atravessando organizacoes. **Tem exatamente um chamador
   * legitimo:** a PreAuthJwtStrategy.
   *
   * O token de pre-auth e emitido no passo 1 do login, ANTES de a organizacao
   * ser escolhida, entao nao ha `organizationId` para recortar.
   *
   * O nome e longo e desconfortavel de proposito: num use case de negocio ele
   * deve parecer errado a quem le. A alternativa -- um `organizationId?:`
   * opcional no `findById` -- seria bem pior, porque uma chamada que
   * esquecesse o argumento continuaria compilando e passaria a ler entre
   * organizacoes em silencio.
   */
  findByIdAcrossOrganizations(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  listUsersActive(input: {
    organizationId: string;
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        memberships: {
          some: { organizationId: input.organizationId, deletedAt: null },
        },
        ...(input.search
          ? {
              OR: [
                {
                  name: {
                    contains: input.search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: input.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      skip: input.skip,
      take: input.take,
    });
  }

  countActiveUsers(input: {
    organizationId: string;
    search?: string;
  }): Promise<number> {
    return this.prisma.user.count({
      where: {
        deletedAt: null,
        memberships: {
          some: { organizationId: input.organizationId, deletedAt: null },
        },
        ...(input.search
          ? {
              OR: [
                {
                  name: {
                    contains: input.search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: input.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
    });
  }

  /**
   * Escrita por chave primaria: `prisma.user.update` exige `where` unique e
   * portanto nao aceita o predicado de organizacao.
   *
   * A autorizacao segue delegada ao use case, com uma diferenca que importa:
   * a LEITURA que precede esta escrita e recortada por organizacao
   * (`findByIdInOrganization`). Um use case novo que chame este metodo sem
   * fazer aquela leitura antes muta linha de organizacao alheia -- e o ponto
   * de vazamento numero um deste repositorio.
   */
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
}
