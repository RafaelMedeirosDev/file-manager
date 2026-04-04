import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExamCategory } from '@file-manager/shared';
import { ExamRepository } from '../../repositories/ExamRepository';
import { ExamRequestRepository } from '../../repositories/ExamRequestRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';

export type CreateExamRequestInput = {
  userId: string;
  indication?: string;
  examIds: string[];
};

export type CreateExamRequestOutput = {
  id: string;
  userId: string;
  indication: string;
  createdAt: Date;
  updatedAt: Date;
  exams: { id: string; name: string; code: string; category: ExamCategory }[];
};

@Injectable()
export class CreateExamRequestUseCase {
  private readonly logger = new Logger(CreateExamRequestUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly examRepository: ExamRepository,
    private readonly examRequestRepository: ExamRequestRepository,
  ) {}

  async execute(
    input: CreateExamRequestInput,
  ): Promise<CreateExamRequestOutput> {
    this.logger.log('[CreateExamRequestUseCase] Execute started');

    const user = await this.userRepository.findById(input.userId);

    if (!user || user.deletedAt) {
      this.logger.warn('[CreateExamRequestUseCase] User not found', { userId: input.userId });
      throw new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND);
    }

    const exams = await this.examRepository.findManyBy({
      id: { in: input.examIds },
      deletedAt: null,
    });

    if (exams.length !== input.examIds.length) {
      this.logger.warn(
        '[CreateExamRequestUseCase] One or more exams not found',
        { examIds: input.examIds },
      );
      throw new NotFoundException(ErrorMessagesEnum.EXAM_NOT_FOUND);
    }

    const examRequest = await this.examRequestRepository.create({
      userId: input.userId,
      indication: input.indication ?? '',
      examIds: input.examIds,
    });

    this.logger.log('[CreateExamRequestUseCase] Execute finished');

    return {
      id: examRequest.id,
      userId: examRequest.userId,
      indication: examRequest.indication,
      createdAt: examRequest.createdAt,
      updatedAt: examRequest.updatedAt,
      exams: examRequest.exams.map((exam) => ({
        id: exam.id,
        name: exam.name,
        code: exam.code,
        category: exam.category,
      })),
    };
  }
}
