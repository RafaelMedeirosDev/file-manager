import { Injectable } from '@nestjs/common';
import { Exam, ExamCategory, Prisma } from '@prisma/client';
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

  findAll(): Promise<Exam[]> {
    return this.prisma.exam.findMany();
  }

  listExamsActive(name?: string, code?: string, category?: ExamCategory, skip?: number, take?: number): Promise<Exam[]> {
    return this.prisma.exam.findMany({
      where: {
        deletedAt: null,
        ...(name ? {
          name: {
            contains: name,
            mode: 'insensitive'
          }
        }: {}),
        ...(code ? {
          code:{
            contains: code,
            mode: 'insensitive'
          }
        }: {}),
        ...(category ? {
          category: category
        }: {}),
      },
      skip,
      take
    });
  };


  countExamsActive(name?: string, code?: string, category?: ExamCategory): Promise<number> {
    return this.prisma.exam.count({
      where: {
        deletedAt: null,
        ...(name ? {
          name: {
            contains: name,
            mode: 'insensitive'
          }
        }: {}),
        ...(code ? {
          code:{
            contains: code,
            mode: 'insensitive'
          }
        }: {}),
        ...(category ? {
          category: category
        }: {}),
      },
    })
  }
  
  findManyBy(where: Prisma.ExamWhereInput): Promise<Exam[]> {
    return this.prisma.exam.findMany({ where });
  }
}
