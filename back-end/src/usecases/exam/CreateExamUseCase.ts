import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ExamCategory } from '@file-manager/shared';
import { ExamRepository } from '../../repositories/ExamRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

export type CreateExamInput = {
  name: string;
  code: string;
  category: ExamCategory;
};

export type CreateExamOutput = {
  id: string;
  name: string;
  code: string;
  category: ExamCategory;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CreateExamUseCase {
  private readonly logger = new Logger(CreateExamUseCase.name);

  constructor(private readonly examRepository: ExamRepository) {}

  async execute(input: CreateExamInput): Promise<CreateExamOutput> {
    this.logger.log('[CreateExamUseCase] Execute started');

    const existing = await this.examRepository.findByCode(input.code);

    if (existing) {
      this.logger.warn('[CreateExamUseCase] Exam code already registered', { code: input.code });
      throw new ConflictException(
        ErrorMessagesEnum.EXAM_CODE_ALREADY_REGISTERED,
      );
    }

    const exam = await this.examRepository.create({
      name: input.name,
      code: input.code,
      category: input.category,
    });

    this.logger.log('[CreateExamUseCase] Execute finished');

    return {
      id: exam.id,
      name: exam.name,
      code: exam.code,
      category: exam.category,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
    };
  }
}
