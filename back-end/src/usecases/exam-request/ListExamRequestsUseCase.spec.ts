import { Test, TestingModule } from '@nestjs/testing';
import { ExamCategory } from '@file-manager/shared';
import { ListExamRequestsUseCase } from './ListExamRequestsUseCase';
import { ExamRequestRepository } from '../../repositories/ExamRequestRepository';

// ── Factories ─────────────────────────────────────────────────────────────────

function userMock(overrides = {}) {
  return {
    id: 'user-uuid-001',
    name: 'Alice',
    email: 'alice@example.com',
    password: 'hashed',
    role: 'USER',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
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
    indication: 'Rotina',
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
    deletedAt: null,
    user: userMock(),
    exams: [examMock()],
    ...overrides,
  };
}

// ── Mock repository ───────────────────────────────────────────────────────────

const mockExamRequestRepository = {
  listExamsRequestActive: jest.fn(),
  countExamRequestActive: jest.fn(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

let useCase: ListExamRequestsUseCase;

describe('ListExamRequestsUseCase', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListExamRequestsUseCase,
        { provide: ExamRequestRepository, useValue: mockExamRequestRepository },
      ],
    }).compile();

    useCase = module.get<ListExamRequestsUseCase>(ListExamRequestsUseCase);
    jest.clearAllMocks();
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  describe('should be able to list exam requests with success', () => {
    it('returns mapped data and correct meta on page 1 with no filters', async () => {
      const requests = [
        examRequestMock({ id: 'req-1' }),
        examRequestMock({ id: 'req-2' }),
      ];
      mockExamRequestRepository.listExamsRequestActive.mockResolvedValueOnce(requests);
      mockExamRequestRepository.countExamRequestActive.mockResolvedValueOnce(2);

      const result = await useCase.execute({});

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('req-1');
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.skip).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
    });

    it('maps repository result to correct output shape', async () => {
      const exam = examMock({ id: 'exam-x', name: 'PCR', code: '99999', category: ExamCategory.HEMATOLOGY });
      const req = examRequestMock({ id: 'req-x', userId: 'user-x', indication: 'Febre', exams: [exam] });
      mockExamRequestRepository.listExamsRequestActive.mockResolvedValueOnce([req]);
      mockExamRequestRepository.countExamRequestActive.mockResolvedValueOnce(1);

      const result = await useCase.execute({});

      expect(result.data[0]).toEqual({
        id: 'req-x',
        userId: 'user-x',
        indication: 'Febre',
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        user: { id: req.user.id, name: req.user.name, email: req.user.email },
        exams: [{ id: 'exam-x', name: 'PCR', code: '99999', category: ExamCategory.HEMATOLOGY }],
      });
    });

    it('calculates skip and hasNextPage correctly for page 2', async () => {
      mockExamRequestRepository.listExamsRequestActive.mockResolvedValueOnce([
        examRequestMock({ id: 'req-3' }),
        examRequestMock({ id: 'req-4' }),
      ]);
      mockExamRequestRepository.countExamRequestActive.mockResolvedValueOnce(5);

      const result = await useCase.execute({ page: 2, limit: 2 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.skip).toBe(2);
      expect(result.meta.hasNextPage).toBe(true);
    });

    it('passes userId, dateFrom, dateTo, and examIds to the repository', async () => {
      mockExamRequestRepository.listExamsRequestActive.mockResolvedValueOnce([]);
      mockExamRequestRepository.countExamRequestActive.mockResolvedValueOnce(0);

      await useCase.execute({
        userId: 'user-alice',
        dateFrom: '2026-01-01',
        dateTo: '2026-03-31',
        examIds: ['exam-a'],
      });

      expect(mockExamRequestRepository.listExamsRequestActive).toHaveBeenCalledWith(
        'user-alice',
        new Date('2026-01-01'),
        new Date('2026-03-31'),
        ['exam-a'],
        0,
        10,
      );
      expect(mockExamRequestRepository.countExamRequestActive).toHaveBeenCalledWith(
        'user-alice',
        new Date('2026-01-01'),
        new Date('2026-03-31'),
        ['exam-a'],
      );
    });

    it('passes undefined for dateFrom and dateTo when not provided', async () => {
      mockExamRequestRepository.listExamsRequestActive.mockResolvedValueOnce([]);
      mockExamRequestRepository.countExamRequestActive.mockResolvedValueOnce(0);

      await useCase.execute({});

      expect(mockExamRequestRepository.listExamsRequestActive).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        0,
        10,
      );
    });

    it('passes undefined for examIds when the array is empty', async () => {
      mockExamRequestRepository.listExamsRequestActive.mockResolvedValueOnce([]);
      mockExamRequestRepository.countExamRequestActive.mockResolvedValueOnce(0);

      await useCase.execute({ examIds: [] });

      expect(mockExamRequestRepository.listExamsRequestActive).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        0,
        10,
      );
    });

    it('returns empty data when repository returns no results', async () => {
      mockExamRequestRepository.listExamsRequestActive.mockResolvedValueOnce([]);
      mockExamRequestRepository.countExamRequestActive.mockResolvedValueOnce(0);

      const result = await useCase.execute({});

      expect(result.data).toHaveLength(0);
      expect(result.meta.skip).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
    });
  });
});
