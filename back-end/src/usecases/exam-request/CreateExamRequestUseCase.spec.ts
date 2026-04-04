import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ExamCategory } from '@file-manager/shared';
import { CreateExamRequestUseCase } from './CreateExamRequestUseCase';
import { UserRepository } from '../../repositories/UserRepository';
import { ExamRepository } from '../../repositories/ExamRepository';
import { ExamRequestRepository } from '../../repositories/ExamRequestRepository';
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';

// ── Factories ─────────────────────────────────────────────────────────────────

function userMock(overrides = {}) {
  return {
    id: 'user-uuid-001',
    name: 'Alice',
    email: 'alice@example.com',
    password: 'hashed',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

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
    indication: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    exams: [examMock()],
    ...overrides,
  };
}

// ── Mocked repositories ───────────────────────────────────────────────────────

const mockUserRepository = {
  findById: jest.fn(),
};

const mockExamRepository = {
  findManyBy: jest.fn(),
};

const mockExamRequestRepository = {
  create: jest.fn(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

let useCase: CreateExamRequestUseCase;

describe('CreateExamRequestUseCase', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateExamRequestUseCase,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: ExamRepository, useValue: mockExamRepository },
        { provide: ExamRequestRepository, useValue: mockExamRequestRepository },
      ],
    }).compile();

    useCase = module.get<CreateExamRequestUseCase>(CreateExamRequestUseCase);

    jest.clearAllMocks();
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  describe('should be able to create exam request with success', () => {
    it('creates with explicit indication', async () => {
      mockUserRepository.findById.mockResolvedValueOnce(userMock());
      mockExamRepository.findManyBy.mockResolvedValueOnce([examMock()]);
      mockExamRequestRepository.create.mockResolvedValueOnce(
        examRequestMock({ indication: 'Paciente em jejum' }),
      );

      const result = await useCase.execute({
        userId: 'user-uuid-001',
        indication: 'Paciente em jejum',
        examIds: ['exam-uuid-001'],
      });

      expect(mockExamRequestRepository.create).toHaveBeenCalledWith({
        userId: 'user-uuid-001',
        indication: 'Paciente em jejum',
        examIds: ['exam-uuid-001'],
      });
      expect(result.indication).toBe('Paciente em jejum');
      expect(result.exams).toHaveLength(1);
    });

    it('defaults indication to empty string when undefined', async () => {
      mockUserRepository.findById.mockResolvedValueOnce(userMock());
      mockExamRepository.findManyBy.mockResolvedValueOnce([examMock()]);
      mockExamRequestRepository.create.mockResolvedValueOnce(examRequestMock());

      await useCase.execute({
        userId: 'user-uuid-001',
        indication: undefined,
        examIds: ['exam-uuid-001'],
      });

      expect(mockExamRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ indication: '' }),
      );
    });
  });

  // ── Error cases ─────────────────────────────────────────────────────────────

  describe('should not be able to create exam request if', () => {
    it('user is not found', async () => {
      mockUserRepository.findById.mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ userId: 'nonexistent', indication: undefined, examIds: ['exam-uuid-001'] }),
      ).rejects.toThrow(new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND));
    });

    it('user is soft-deleted', async () => {
      mockUserRepository.findById.mockResolvedValueOnce(userMock({ deletedAt: new Date() }));

      await expect(
        useCase.execute({ userId: 'user-uuid-001', indication: undefined, examIds: ['exam-uuid-001'] }),
      ).rejects.toThrow(new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND));
    });

    it('one or more exams are not found', async () => {
      mockUserRepository.findById.mockResolvedValueOnce(userMock());
      // returns fewer exams than requested
      mockExamRepository.findManyBy.mockResolvedValueOnce([]);

      await expect(
        useCase.execute({ userId: 'user-uuid-001', indication: undefined, examIds: ['exam-uuid-001'] }),
      ).rejects.toThrow(new NotFoundException(ErrorMessagesEnum.EXAM_NOT_FOUND));
    });
  });
});
