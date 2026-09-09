import { Injectable } from '@nestjs/common';
import { Exam, ExamCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ExamRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    name: string;
    code: string;
    category: ExamCategory;
  }): Promise<Exam> {
    return this.prisma.exam.create({ data });
  }

  /**
   * Busca por codigo em TODAS as linhas, incluindo as soft-deletadas.
   *
   * A coluna `code` e unique no banco sem recorte de deletedAt, entao filtrar
   * aqui criava divergencia: a guarda de CreateExamUseCase nao via o registro
   * excluido, o INSERT estourava a unique e o cliente recebia 500 em vez de
   * 409. Consultar tudo mantem aplicacao e banco de acordo -- e o mesmo
   * criterio que UserRepository.findByEmail usa para o e-mail.
   *
   * Efeito colateral aceito: um codigo soft-deletado nao pode ser reaproveitado.
   * Se um dia precisar ser, o caminho e um unique parcial
   * (`WHERE deleted_at IS NULL`) em SQL bruto, ciente de que o Prisma nao
   * expressa esse recorte e tentaria remove-lo a cada `migrate dev`.
   */
  findByCode(code: string): Promise<Exam | null> {
    return this.prisma.exam.findFirst({
      where: { code },
    });
  }

  findAll(): Promise<Exam[]> {
    return this.prisma.exam.findMany();
  }

  listExamsActive(
    name?: string,
    code?: string,
    category?: ExamCategory,
    skip?: number,
    take?: number,
  ): Promise<Exam[]> {
    return this.prisma.exam.findMany({
      where: {
        deletedAt: null,
        ...(name
          ? {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(code
          ? {
              code: {
                contains: code,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(category
          ? {
              category: category,
            }
          : {}),
      },
      // Paginar sem ordenacao nao garante ordem estavel entre paginas: o
      // Postgres pode devolver a mesma linha duas vezes ou nenhuma conforme o
      // plano escolhido. Mesmo criterio das outras listagens do projeto.
      orderBy: { name: 'asc' },
      skip,
      take,
    });
  }

  countExamsActive(
    name?: string,
    code?: string,
    category?: ExamCategory,
  ): Promise<number> {
    return this.prisma.exam.count({
      where: {
        deletedAt: null,
        ...(name
          ? {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(code
          ? {
              code: {
                contains: code,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(category
          ? {
              category: category,
            }
          : {}),
      },
    });
  }

  findById(id: string): Promise<Exam | null> {
    return this.prisma.exam.findUnique({ where: { id } });
  }

  softDeleteById(id: string, deletedAt: Date): Promise<Exam> {
    return this.prisma.exam.update({ where: { id }, data: { deletedAt } });
  }

  findManyBy(where: Prisma.ExamWhereInput): Promise<Exam[]> {
    return this.prisma.exam.findMany({ where });
  }
}
