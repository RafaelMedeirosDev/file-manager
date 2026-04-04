import { Injectable, Logger } from '@nestjs/common';
import { ExamCategory } from '@file-manager/shared';
import { ExamRequestRepository } from '../../repositories/ExamRequestRepository';

export type ListExamRequestsInput = {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  examIds?: string[];
};

export type ExamRequestListItem = {
  id: string;
  userId: string;
  indication: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; email: string };
  exams: { id: string; name: string; code: string; category: ExamCategory }[];
};

export type ListExamRequestsOutput = {
  data: ExamRequestListItem[];
  meta: { page: number; limit: number; total: number; hasNextPage: boolean };
};

@Injectable()
export class ListExamRequestsUseCase {
  private readonly logger = new Logger(ListExamRequestsUseCase.name);

  constructor(
    private readonly examRequestRepository: ExamRequestRepository,
  ) {}

  async execute(input: ListExamRequestsInput): Promise<ListExamRequestsOutput> {
    this.logger.log('[ListExamRequestsUseCase] Execute started');

    const page = input.page ?? 1;
    const limit = input.limit ?? 10;

    const dateFrom = input.dateFrom ? new Date(input.dateFrom) : undefined;
    const dateTo = input.dateTo ? new Date(input.dateTo) : undefined;

    const all = await this.examRequestRepository.findAll();

    const filtered = all.filter((req) => {
      if (req.deletedAt) return false;
      if (req.user.role !== 'USER') return false;
      if (input.userId && req.userId !== input.userId) return false;
      if (dateFrom && req.createdAt < dateFrom) return false;
      if (dateTo && req.createdAt > dateTo) return false;
      if (input.examIds && input.examIds.length > 0) {
        const reqExamIds = req.exams.map((e) => e.id);
        const hasMatch = input.examIds.some((id) => reqExamIds.includes(id));
        if (!hasMatch) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const total = sorted.length;
    const start = (page - 1) * limit;

    const data = sorted.slice(start, start + limit).map((req) => ({
      id: req.id,
      userId: req.userId,
      indication: req.indication,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
      exams: req.exams.map((exam) => ({
        id: exam.id,
        name: exam.name,
        code: exam.code,
        category: exam.category,
      })),
    }));

    this.logger.log('[ListExamRequestsUseCase] Execute finished');

    return {
      data,
      meta: { page, limit, total, hasNextPage: start + limit < total },
    };
  }
}
