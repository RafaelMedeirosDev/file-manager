import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExamCategory } from '@file-manager/shared';
import { ExamRequestRepository } from '../../repositories/ExamRequestRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

export type GetExamRequestByIdInput = {
  id: string;
};

export type GetExamRequestByIdOutput = {
  id: string;
  userId: string;
  indication: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; email: string };
  exams: { id: string; name: string; code: string; category: ExamCategory }[];
};

@Injectable()
export class GetExamRequestByIdUseCase {
  private readonly logger = new Logger(GetExamRequestByIdUseCase.name);

  constructor(
    private readonly examRequestRepository: ExamRequestRepository,
  ) {}

  async execute(input: GetExamRequestByIdInput): Promise<GetExamRequestByIdOutput> {
    this.logger.log('[GetExamRequestByIdUseCase] Execute started', { id: input.id });

    const examRequest = await this.examRequestRepository.findById(input.id);

    if (!examRequest || examRequest.deletedAt) {
      this.logger.warn('[GetExamRequestByIdUseCase] ExamRequest not found', { id: input.id });
      throw new NotFoundException(ErrorMessagesEnum.EXAM_REQUEST_NOT_FOUND);
    }

    this.logger.log('[GetExamRequestByIdUseCase] Execute finished');

    return {
      id: examRequest.id,
      userId: examRequest.userId,
      indication: examRequest.indication,
      createdAt: examRequest.createdAt,
      updatedAt: examRequest.updatedAt,
      user: {
        id: examRequest.user.id,
        name: examRequest.user.name,
        email: examRequest.user.email,
      },
      exams: examRequest.exams.map((exam) => ({
        id: exam.id,
        name: exam.name,
        code: exam.code,
        category: exam.category,
      })),
    };
  }
}
