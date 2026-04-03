import { Injectable, Logger } from '@nestjs/common';
import { ExamCategory } from '@prisma/client';
import { ExamRepository } from '../../repositories/ExamRepository';

export type ListExamsOutput = {
  data: Array<{
    id: string;
    name: string;
    code: string;
    category: ExamCategory;
    createdAt: Date;
    updatedAt: Date;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
};

@Injectable()
export class ListExamsUseCase {
  private readonly logger = new Logger(ListExamsUseCase.name);

  constructor(private readonly examRepository: ExamRepository) {}

  async execute(input?: {
    page?: number;
    limit?: number;
    name?: string;
    code?: string;
    category?: ExamCategory;
  }): Promise<ListExamsOutput> {
    this.logger.log('[ListExamsUseCase] Execute started');

    const page = input?.page ?? 1;
    const limit = input?.limit ?? 10;
    const normalizedName = input?.name?.trim().toLowerCase();
    const normalizedCode = input?.code?.trim().toLowerCase();

    const exams = await this.examRepository.findAll();

    const filtered = exams.filter((exam) => {
      if (exam.deletedAt) return false;
      if (normalizedName && !exam.name.toLowerCase().includes(normalizedName)) return false;
      if (normalizedCode && !exam.code.toLowerCase().includes(normalizedCode)) return false;
      if (input?.category && exam.category !== input.category) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
    );

    const total = sorted.length;
    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + limit);

    this.logger.log('[ListExamsUseCase] Execute finished');

    return {
      data: paginated.map((exam) => ({
        id: exam.id,
        name: exam.name,
        code: exam.code,
        category: exam.category,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
      })),
      meta: {
        page,
        limit,
        total,
        hasNextPage: start + limit < total,
      },
    };
  }
}
