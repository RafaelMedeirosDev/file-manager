import { Injectable } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Nao filtra `deletedAt`: quem chama precisa distinguir "nao existe" de
   * "existe e foi desativada", e a checagem fica explicita la -- o mesmo
   * criterio dos outros `findById` do projeto.
   */
  findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { id } });
  }
}
