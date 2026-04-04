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

  findAll(): Promise<ExamRequestWithExamsAndUser[]> {
    return this.prisma.examRequest.findMany({
      include: { exams: true, user: true },
    });
  }

  findById(id: string): Promise<ExamRequestWithExamsAndUser | null> {
    return this.prisma.examRequest.findUnique({
      where: { id },
      include: { exams: true, user: true },
    });
  }

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

  create(data: {
    userId: string;
    indication?: string;
    examIds: string[];
  }): Promise<ExamRequestWithExams> {
    return this.prisma.examRequest.create({
      data: {
        userId: data.userId,
        indication: data.indication ?? '',
        exams: {
          connect: data.examIds.map((id) => ({ id })),
        },
      },
      include: { exams: true },
    });
  }
}
