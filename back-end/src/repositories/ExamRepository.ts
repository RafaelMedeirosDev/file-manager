import { Injectable } from '@nestjs/common';
import { Exam, ExamCategory } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ExamRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { name: string; code: string; category: ExamCategory }): Promise<Exam> {
    return this.prisma.exam.create({ data });
  }

  findByCode(code: string): Promise<Exam | null> {
    return this.prisma.exam.findFirst({
      where: { code, deletedAt: null },
    });
  }
}
