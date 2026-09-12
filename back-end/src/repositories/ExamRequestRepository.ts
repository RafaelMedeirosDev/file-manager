import { Injectable } from '@nestjs/common';
import { ExamCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type ExamRequestWithExams = Prisma.ExamRequestGetPayload<{
  include: { exams: true };
}>;

export type ExamRequestWithExamsAndUser = Prisma.ExamRequestGetPayload<{
  include: { exams: true; user: true };
}>;

export type ExamSummary = {
  id: string;
  name: string;
  code: string;
  category: ExamCategory;
};

@Injectable()
export class ExamRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `findFirst`, e nao `findUnique`: e o que permite somar o predicado de
   * organizacao ao id.
   */
  findById(
    organizationId: string,
    id: string,
  ): Promise<ExamRequestWithExamsAndUser | null> {
    return this.prisma.examRequest.findFirst({
      where: { id, organizationId },
      include: { exams: true, user: true },
    });
  }

  /**
   * Escrita por chave primaria: `update` exige `where` unique. A leitura que
   * precede esta escrita e a recortada (`findById`) -- ver a nota equivalente
   * em UserRepository.updateById.
   *
   * O `exams: { set: ... }` abaixo reescreve a juncao `_ExamToExamRequest` por
   * id puro, sem nenhum recorte possivel. Quem garante que os ids sao da mesma
   * organizacao e ExamRepository.findActiveByIds, chamado no use case antes
   * daqui.
   */
  update(
    id: string,
    data: { indication?: string; examIds?: string[] },
  ): Promise<ExamRequestWithExamsAndUser> {
    return this.prisma.examRequest.update({
      where: { id },
      data: {
        ...(data.indication !== undefined && { indication: data.indication }),
        ...(data.examIds !== undefined && {
          exams: { set: data.examIds.map((examId) => ({ id: examId })) },
        }),
      },
      include: { exams: true, user: true },
    });
  }

  /**
   * O `exams: { connect: ... }` liga a juncao `_ExamToExamRequest` por id puro
   * -- mesma nota de `update`: a garantia de que os exames sao da mesma
   * organizacao vem de ExamRepository.findActiveByIds, no use case.
   */
  create(data: {
    organizationId: string;
    userId: string;
    indication?: string;
    examIds: string[];
  }): Promise<ExamRequestWithExams> {
    return this.prisma.examRequest.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        indication: data.indication ?? '',
        exams: {
          connect: data.examIds.map((id) => ({ id })),
        },
      },
      include: { exams: true },
    });
  }

  listExamsRequestActive(input: {
    organizationId: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    examsIds?: string[];
    skip?: number;
    take?: number;
  }): Promise<ExamRequestWithExamsAndUser[]> {
    const { organizationId, userId, dateFrom, dateTo, examsIds } = input;

    return this.prisma.examRequest.findMany({
      where: {
        // Incondicional, fora de qualquer spread.
        organizationId,
        deletedAt: null,
        ...(userId ? { userId } : {}),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
        ...(examsIds && examsIds.length > 0
          ? {
              exams: { some: { id: { in: examsIds } } },
            }
          : {}),
      },
      include: {
        exams: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: input.skip,
      take: input.take,
    });
  }

  countExamRequestActive(input: {
    organizationId: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    examsIds?: string[];
  }): Promise<number> {
    const { organizationId, userId, dateFrom, dateTo, examsIds } = input;

    return this.prisma.examRequest.count({
      where: {
        organizationId,
        deletedAt: null,
        ...(userId ? { userId } : {}),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
        ...(examsIds && examsIds.length > 0
          ? {
              exams: { some: { id: { in: examsIds } } },
            }
          : {}),
      },
    });
  }
}
