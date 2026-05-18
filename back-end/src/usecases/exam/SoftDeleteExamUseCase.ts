import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExamRepository } from '../../repositories/ExamRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

export type SoftDeleteExamOutput = {
  id: string;
  deletedAt: string;
};

@Injectable()
export class SoftDeleteExamUseCase {
  private readonly logger = new Logger(SoftDeleteExamUseCase.name);

  constructor(private readonly examRepository: ExamRepository) {}

  async execute(input: { id: string }): Promise<SoftDeleteExamOutput> {
    this.logger.log('[SoftDeleteExamUseCase] Execute started');

    const exam = await this.examRepository.findById(input.id);

    if (!exam || exam.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.EXAM_NOT_FOUND);
    }

    const deletedAt = new Date();
    await this.examRepository.softDeleteById(input.id, deletedAt);

    this.logger.log('[SoftDeleteExamUseCase] Execute finished');

    return { id: input.id, deletedAt: deletedAt.toISOString() };
  }
}
