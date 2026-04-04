import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExamCategory } from '@file-manager/shared';
import { ExamRepository } from '../../repositories/ExamRepository';
import { ExamRequestRepository } from '../../repositories/ExamRequestRepository';
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';

export type UpdateExamRequestInput = {
  id: string;
  indication?: string;
  examIds?: string[];
};

export type UpdateExamRequestOutput = {
  id: string;
  userId: string;
  indication: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; email: string };
  exams: { id: string; name: string; code: string; category: ExamCategory }[];
};

@Injectable()
export class UpdateExamRequestUseCase {
  private readonly logger = new Logger(UpdateExamRequestUseCase.name);

  constructor(
    private readonly examRequestRepository: ExamRequestRepository,
    private readonly examRepository: ExamRepository,
  ) {}

  async execute(input: UpdateExamRequestInput): Promise<UpdateExamRequestOutput> {
    this.logger.log('[UpdateExamRequestUseCase] Execute started', { id: input.id });

    if (input.indication === undefined && input.examIds === undefined) {
      this.logger.warn('[UpdateExamRequestUseCase] No fields provided for update', { id: input.id });
      throw new BadRequestException(ErrorMessagesEnum.AT_LEAST_ONE_FIELD_REQUIRED);
    }

    const examRequest = await this.examRequestRepository.findById(input.id);

    if (!examRequest || examRequest.deletedAt) {
      this.logger.warn('[UpdateExamRequestUseCase] ExamRequest not found', { id: input.id });
      throw new NotFoundException(ErrorMessagesEnum.EXAM_REQUEST_NOT_FOUND);
    }

    if (input.examIds !== undefined) {
      const exams = await this.examRepository.findManyBy({
        id: { in: input.examIds },
        deletedAt: null,
      });

      if (exams.length !== input.examIds.length) {
        this.logger.warn('[UpdateExamRequestUseCase] One or more exams not found', { examIds: input.examIds });
        throw new NotFoundException(ErrorMessagesEnum.EXAM_NOT_FOUND);
      }
    }

    const updated = await this.examRequestRepository.update(input.id, {
      indication: input.indication,
      examIds: input.examIds,
    });

    this.logger.log('[UpdateExamRequestUseCase] Execute finished');

    return {
      id: updated.id,
      userId: updated.userId,
      indication: updated.indication,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      user: {
        id: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
      },
      exams: updated.exams.map((exam) => ({
        id: exam.id,
        name: exam.name,
        code: exam.code,
        category: exam.category,
      })),
    };
  }
}
