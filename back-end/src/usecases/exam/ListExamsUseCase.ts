import { Injectable, Logger } from '@nestjs/common';
import { ExamCategory } from '@file-manager/shared';
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
    const skip = (page - 1) * limit;
    const normalizedName = input?.name?.trim().toLowerCase();
    const normalizedCode = input?.code?.trim().toLowerCase();
    const normalizedCategory = input?.category;

    const exams = await this.examRepository.listExamsActive(normalizedName, normalizedCode, normalizedCategory, skip, limit);
    const totalExams = await this.examRepository.countExamsActive(normalizedName, normalizedCode, normalizedCategory);

    
    const paginatedExams = exams.map((exam) => ({
        id: exam.id,
        name: exam.name,
        code: exam.code,
        category: exam.category,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
      })
    );
    

    this.logger.log('[ListExamsUseCase] Execute finished');

    return {
      data: paginatedExams,
      meta: {
        page,
        limit,
        total: totalExams,
        hasNextPage: totalExams > skip + limit,
      },
    };
  }
}
