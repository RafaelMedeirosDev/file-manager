import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { SoftDeleteExamUseCase } from './SoftDeleteExamUseCase';
import { ExamRepository } from '../../repositories/ExamRepository';

const ORGANIZATION_ID = 'org-uuid-principal';

const NOW = new Date('2026-08-22T12:00:00.000Z');

// ── Factories ────────────────────────────────────────────
function examMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exam-uuid-001',
    name: 'Hemograma completo',
    code: '40304361',
    deletedAt: null,
    ...overrides,
  };
}

// ── Mock repository ──────────────────────────────────────
const mockExamRepository = { findById: jest.fn(), softDeleteById: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('SoftDeleteExamUseCase', () => {
  let useCase: SoftDeleteExamUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoftDeleteExamUseCase,
        { provide: ExamRepository, useValue: mockExamRepository },
      ],
    }).compile();

    useCase = module.get<SoftDeleteExamUseCase>(SoftDeleteExamUseCase);
    jest.clearAllMocks();
    // O deletedAt do output vem de um `new Date()` interno, nao do retorno
    // do repositorio: sem relogio fixo a asserção seria nao deterministica.
    jest.useFakeTimers().setSystemTime(NOW.getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to soft delete an exam with success', () => {
    it('marks the exam as deleted and echoes the input id', async () => {
      mockExamRepository.findById.mockResolvedValue(examMock());
      mockExamRepository.softDeleteById.mockResolvedValue(undefined);

      const output = await useCase.execute({
        organizationId: ORGANIZATION_ID,
        id: 'exam-uuid-001',
      });

      expect(mockExamRepository.softDeleteById).toHaveBeenCalledWith(
        'exam-uuid-001',
        NOW,
      );
      expect(output).toEqual({
        id: 'exam-uuid-001',
        deletedAt: NOW.toISOString(),
      });
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to soft delete an exam if', () => {
    it('the exam does not exist', async () => {
      mockExamRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ organizationId: ORGANIZATION_ID, id: 'missing' }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.EXAM_NOT_FOUND),
      );

      expect(mockExamRepository.softDeleteById).not.toHaveBeenCalled();
    });

    it('the exam is already soft-deleted', async () => {
      mockExamRepository.findById.mockResolvedValue(
        examMock({ deletedAt: new Date('2026-01-02T00:00:00.000Z') }),
      );

      await expect(
        useCase.execute({
          organizationId: ORGANIZATION_ID,
          id: 'exam-uuid-001',
        }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.EXAM_NOT_FOUND),
      );

      expect(mockExamRepository.softDeleteById).not.toHaveBeenCalled();
    });
  });
});
