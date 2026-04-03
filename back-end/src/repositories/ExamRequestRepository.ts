import { Injectable } from '@nestjs/common';
import { ExamCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type ExamRequestWithExams = Prisma.ExamRequestGetPayload<{
  include: { exams: true };
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

  create(data: {
    userId: string;
    indication: string;
    examIds: string[];
  }): Promise<ExamRequestWithExams> {
    return this.prisma.examRequest.create({
      data: {
        userId: data.userId,
        indication: data.indication,
        exams: {
          connect: data.examIds.map((id) => ({ id })),
        },
      },
      include: { exams: true },
    });
  }
}
