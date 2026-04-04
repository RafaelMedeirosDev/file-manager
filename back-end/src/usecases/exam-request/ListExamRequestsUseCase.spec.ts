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

const mockExamRequestRepository = { findAll: jest.fn() };

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
    it('returns all non-deleted requests with no filters', async () => {
      const requests = [
        examRequestMock({ id: 'req-1', createdAt: new Date('2026-03-02') }),
        examRequestMock({ id: 'req-2', createdAt: new Date('2026-03-01') }),
      ];
      mockExamRequestRepository.findAll.mockResolvedValueOnce(requests);

      const result = await useCase.execute({});

      expect(result.data).toHaveLength(2);
      // sorted by createdAt DESC
      expect(result.data[0].id).toBe('req-1');
      expect(result.data[1].id).toBe('req-2');
      expect(result.meta.total).toBe(2);
    });

    it('excludes requests whose user has role ADMIN', async () => {
      mockExamRequestRepository.findAll.mockResolvedValueOnce([
        examRequestMock({ id: 'req-user',  user: userMock({ role: 'USER' }) }),
        examRequestMock({ id: 'req-admin', user: userMock({ role: 'ADMIN' }) }),
      ]);

      const result = await useCase.execute({});

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('req-user');
    });

    it('excludes soft-deleted requests', async () => {
      mockExamRequestRepository.findAll.mockResolvedValueOnce([
        examRequestMock({ id: 'req-active' }),
        examRequestMock({ id: 'req-deleted', deletedAt: new Date() }),
      ]);

      const result = await useCase.execute({});

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('req-active');
    });

    it('filters by userId', async () => {
      mockExamRequestRepository.findAll.mockResolvedValueOnce([
        examRequestMock({ id: 'req-alice', userId: 'user-alice' }),
        examRequestMock({ id: 'req-bob', userId: 'user-bob' }),
      ]);

      const result = await useCase.execute({ userId: 'user-alice' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('req-alice');
    });

    it('filters by dateFrom', async () => {
      mockExamRequestRepository.findAll.mockResolvedValueOnce([
        examRequestMock({ id: 'req-jan', createdAt: new Date('2026-01-10') }),
        examRequestMock({ id: 'req-mar', createdAt: new Date('2026-03-10') }),
      ]);

      const result = await useCase.execute({ dateFrom: '2026-02-01' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('req-mar');
    });

    it('filters by dateTo', async () => {
      mockExamRequestRepository.findAll.mockResolvedValueOnce([
        examRequestMock({ id: 'req-jan', createdAt: new Date('2026-01-10') }),
        examRequestMock({ id: 'req-mar', createdAt: new Date('2026-03-10') }),
      ]);

      const result = await useCase.execute({ dateTo: '2026-02-01' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('req-jan');
    });

    it('filters by examIds (any match)', async () => {
      const examA = examMock({ id: 'exam-a' });
      const examB = examMock({ id: 'exam-b' });
      mockExamRequestRepository.findAll.mockResolvedValueOnce([
        examRequestMock({ id: 'req-with-a', exams: [examA] }),
        examRequestMock({ id: 'req-with-b', exams: [examB] }),
      ]);

      const result = await useCase.execute({ examIds: ['exam-a'] });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('req-with-a');
    });

    it('applies pagination', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        examRequestMock({ id: `req-${i}`, createdAt: new Date(2026, 0, i + 1) }),
      );
      mockExamRequestRepository.findAll.mockResolvedValueOnce(requests);

      const result = await useCase.execute({ page: 2, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.total).toBe(5);
      expect(result.meta.hasNextPage).toBe(true);
    });

    it('returns empty data when no requests match', async () => {
      mockExamRequestRepository.findAll.mockResolvedValueOnce([]);

      const result = await useCase.execute({});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
    });
  });
});
