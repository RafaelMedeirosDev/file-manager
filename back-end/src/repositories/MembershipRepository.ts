import { Injectable } from '@nestjs/common';
import { Membership, Prisma, ROLE } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type MembershipWithUserAndOrganization = Prisma.MembershipGetPayload<{
  include: { user: true; organization: true };
}>;

@Injectable()
export class MembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId: string;
    organizationId: string;
    role: ROLE;
  }): Promise<Membership> {
    return this.prisma.membership.create({ data });
  }

  /**
   * Traz a associacao com usuario e organizacao para que quem chama decida
   * sobre os tres `deletedAt` numa consulta so. E o que sustenta a validacao
   * por requisicao do JwtStrategy sem multiplicar round trips.
   *
   * Nao filtra `deletedAt` de proposito, em nenhum dos tres niveis: a unique
   * `(user_id, organization_id)` tambem nao tem esse recorte, e filtrar aqui
   * criaria a mesma divergencia que o comentario de
   * ExamRepository.findByCode descreve -- a aplicacao nao veria a linha, o
   * banco veria, e o INSERT estouraria a unique.
   */
  findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<MembershipWithUserAndOrganization | null> {
    return this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { user: true, organization: true },
    });
  }

  /**
   * As associacoes ativas de um usuario, para o passo 1 do login montar a
   * lista de organizacoes que ele pode acessar.
   *
   * Recorta pelos tres `deletedAt` porque aqui o resultado e uma oferta ao
   * cliente: uma organizacao desativada nao deve nem aparecer como opcao.
   */
  listActiveByUserId(
    userId: string,
  ): Promise<MembershipWithUserAndOrganization[]> {
    return this.prisma.membership.findMany({
      where: {
        userId,
        deletedAt: null,
        organization: { deletedAt: null },
      },
      include: { user: true, organization: true },
      orderBy: { organization: { name: 'asc' } },
    });
  }
}
