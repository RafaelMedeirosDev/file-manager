import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ExamCategory } from '@file-manager/shared';
import { GetExamRequestByIdUseCase } from './GetExamRequestByIdUseCase';
import { ExamRequestRepository } from '../../repositories/ExamRequestRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

function examRequestMock(overrides = {}) {
  return {
    id: 'req-uuid-001',
    userId: 'user-uuid-001',
    indication: 'Rotina',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    user: { id: 'user-uuid-001', name: 'Alice', email: 'alice@example.com', role: 'USER' },
    exams: [{
      id: 'exam-uuid-001', name: 'Hemograma', code: '40303630',
      category: ExamCategory.HEMATOLOGY, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    }],
    ...overrides,
  };
}

const mockExamRequestRepository = { findById: jest.fn() };

let useCase: GetExamRequestByIdUseCase;

describe('GetExamRequestByIdUseCase', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetExamRequestByIdUseCase,
        { provide: ExamRequestRepository, useValue: mockExamRequestRepository },
      ],
    }).compile();

    useCase = module.get<GetExamRequestByIdUseCase>(GetExamRequestByIdUseCase);
    jest.clearAllMocks();
  });

  describe('should be able to get exam request by id with success', () => {
    it('returns the exam request with user and exams', async () => {
      mockExamRequestRepository.findById.mockResolvedValueOnce(examRequestMock());

      const result = await useCase.execute({ id: 'req-uuid-001' });

      expect(result.id).toBe('req-uuid-001');
      expect(result.user.name).toBe('Alice');
      expect(result.exams).toHaveLength(1);
      expect(mockExamRequestRepository.findById).toHaveBeenCalledWith('req-uuid-001');
    });
  });

  describe('should not be able to get exam request by id if', () => {
    it('exam request is not found', async () => {
      mockExamRequestRepository.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute({ id: 'nonexistent' }))
        .rejects.toThrow(new NotFoundException(ErrorMessagesEnum.EXAM_REQUEST_NOT_FOUND));
    });

    it('exam request is soft-deleted', async () => {
      mockExamRequestRepository.findById.mockResolvedValueOnce(
        examRequestMock({ deletedAt: new Date() }),
      );

      await expect(useCase.execute({ id: 'req-uuid-001' }))
        .rejects.toThrow(new NotFoundException(ErrorMessagesEnum.EXAM_REQUEST_NOT_FOUND));
    });
  });
});
