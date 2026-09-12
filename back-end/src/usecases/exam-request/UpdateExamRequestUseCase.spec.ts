import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExamCategory } from '@file-manager/shared';
import { UpdateExamRequestUseCase } from './UpdateExamRequestUseCase';
import { ExamRequestRepository } from '../../repositories/ExamRequestRepository';
import { ExamRepository } from '../../repositories/ExamRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

const ORGANIZATION_ID = 'org-uuid-principal';

function examMock(overrides = {}) {
  return {
    id: 'exam-uuid-001',
    name: 'Hemograma',
    code: '40303630',
    category: ExamCategory.HEMATOLOGY,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function examRequestMock(overrides = {}) {
  return {
    id: 'req-uuid-001',
    userId: 'user-uuid-001',
    indication: 'Rotina',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    user: {
      id: 'user-uuid-001',
      name: 'Alice',
      email: 'alice@example.com',
      role: 'USER',
    },
    exams: [examMock()],
    ...overrides,
  };
}

const mockExamRequestRepository = { findById: jest.fn(), update: jest.fn() };
const mockExamRepository = { findActiveByIds: jest.fn() };

let useCase: UpdateExamRequestUseCase;

describe('UpdateExamRequestUseCase', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateExamRequestUseCase,
        { provide: ExamRequestRepository, useValue: mockExamRequestRepository },
        { provide: ExamRepository, useValue: mockExamRepository },
      ],
    }).compile();

    useCase = module.get<UpdateExamRequestUseCase>(UpdateExamRequestUseCase);
    jest.clearAllMocks();
  });

  describe('should be able to update exam request with success', () => {
    it('updates indication only', async () => {
      const updated = examRequestMock({ indication: 'Urgente' });
      mockExamRequestRepository.findById.mockResolvedValueOnce(
        examRequestMock(),
      );
      mockExamRequestRepository.update.mockResolvedValueOnce(updated);

      const result = await useCase.execute({
        organizationId: ORGANIZATION_ID,
        id: 'req-uuid-001',
        indication: 'Urgente',
      });

      expect(result.indication).toBe('Urgente');
      expect(mockExamRepository.findActiveByIds).not.toHaveBeenCalled();
      expect(mockExamRequestRepository.update).toHaveBeenCalledWith(
        'req-uuid-001',
        {
          indication: 'Urgente',
          examIds: undefined,
        },
      );
    });

    it('updates examIds only, validates exams exist', async () => {
      const newExam = examMock({ id: 'exam-uuid-002' });
      mockExamRequestRepository.findById.mockResolvedValueOnce(
        examRequestMock(),
      );
      mockExamRepository.findActiveByIds.mockResolvedValueOnce([newExam]);
      mockExamRequestRepository.update.mockResolvedValueOnce(
        examRequestMock({ exams: [newExam] }),
      );

      const result = await useCase.execute({
        organizationId: ORGANIZATION_ID,
        id: 'req-uuid-001',
        examIds: ['exam-uuid-002'],
      });

      expect(result.exams[0].id).toBe('exam-uuid-002');
      expect(mockExamRepository.findActiveByIds).toHaveBeenCalledWith(
        ORGANIZATION_ID,
        ['exam-uuid-002'],
      );
    });

    it('updates both indication and examIds', async () => {
      mockExamRequestRepository.findById.mockResolvedValueOnce(
        examRequestMock(),
      );
      mockExamRepository.findActiveByIds.mockResolvedValueOnce([examMock()]);
      mockExamRequestRepository.update.mockResolvedValueOnce(
        examRequestMock({ indication: 'Novo' }),
      );

      await useCase.execute({
        organizationId: ORGANIZATION_ID,
        id: 'req-uuid-001',
        indication: 'Novo',
        examIds: ['exam-uuid-001'],
      });

      expect(mockExamRequestRepository.update).toHaveBeenCalledWith(
        'req-uuid-001',
        {
          indication: 'Novo',
          examIds: ['exam-uuid-001'],
        },
      );
    });
  });

  describe('should not be able to update exam request if', () => {
    it('no fields are provided', async () => {
      await expect(
        useCase.execute({
          organizationId: ORGANIZATION_ID,
          id: 'req-uuid-001',
        }),
      ).rejects.toThrow(
        new BadRequestException(ErrorMessagesEnum.AT_LEAST_ONE_FIELD_REQUIRED),
      );

      expect(mockExamRequestRepository.findById).not.toHaveBeenCalled();
    });

    it('exam request is not found', async () => {
      mockExamRequestRepository.findById.mockResolvedValueOnce(null);

      await expect(
        useCase.execute({
          organizationId: ORGANIZATION_ID,
          id: 'nonexistent',
          indication: 'test',
        }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.EXAM_REQUEST_NOT_FOUND),
      );
    });

    it('exam request is soft-deleted', async () => {
      mockExamRequestRepository.findById.mockResolvedValueOnce(
        examRequestMock({ deletedAt: new Date() }),
      );

      await expect(
        useCase.execute({
          organizationId: ORGANIZATION_ID,
          id: 'req-uuid-001',
          indication: 'test',
        }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.EXAM_REQUEST_NOT_FOUND),
      );
    });

    it('one or more exams are not found', async () => {
      mockExamRequestRepository.findById.mockResolvedValueOnce(
        examRequestMock(),
      );
      mockExamRepository.findActiveByIds.mockResolvedValueOnce([]);

      await expect(
        useCase.execute({
          organizationId: ORGANIZATION_ID,
          id: 'req-uuid-001',
          examIds: ['bad-id'],
        }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.EXAM_NOT_FOUND),
      );
    });
  });
});
