import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorMessagesEnum, ExamCategory } from '@file-manager/shared';
import { CreateExamUseCase } from './CreateExamUseCase';
import { ExamRepository } from '../../repositories/ExamRepository';

// ── Factories ────────────────────────────────────────────
function examMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exam-uuid-001',
    name: 'Hemograma completo',
    code: '40304361',
    category: ExamCategory.HEMATOLOGY,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function inputMock(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Hemograma completo',
    code: '40304361',
    category: ExamCategory.HEMATOLOGY,
    ...overrides,
  };
}

// ── Mock repository ──────────────────────────────────────
const mockExamRepository = { findByCode: jest.fn(), create: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('CreateExamUseCase', () => {
  let useCase: CreateExamUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateExamUseCase,
        { provide: ExamRepository, useValue: mockExamRepository },
      ],
    }).compile();

    useCase = module.get<CreateExamUseCase>(CreateExamUseCase);
    jest.clearAllMocks();
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to create an exam with success', () => {
    it('persists the exam and returns the mapped output', async () => {
      mockExamRepository.findByCode.mockResolvedValue(null);
      mockExamRepository.create.mockResolvedValue(examMock());

      const output = await useCase.execute(inputMock());

      expect(mockExamRepository.create).toHaveBeenCalledWith({
        name: 'Hemograma completo',
        code: '40304361',
        category: ExamCategory.HEMATOLOGY,
      });
      expect(output).toEqual({
        id: 'exam-uuid-001',
        name: 'Hemograma completo',
        code: '40304361',
        category: ExamCategory.HEMATOLOGY,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    });

    it('does not leak deletedAt into the output', async () => {
      mockExamRepository.findByCode.mockResolvedValue(null);
      mockExamRepository.create.mockResolvedValue(examMock());

      const output = await useCase.execute(inputMock());

      expect(output).not.toHaveProperty('deletedAt');
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to create an exam if', () => {
    it('the code is already registered', async () => {
      mockExamRepository.findByCode.mockResolvedValue(examMock());

      await expect(useCase.execute(inputMock())).rejects.toThrow(
        new ConflictException(ErrorMessagesEnum.EXAM_CODE_ALREADY_REGISTERED),
      );

      expect(mockExamRepository.create).not.toHaveBeenCalled();
    });
  });
});
