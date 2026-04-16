import { ExamCategory } from '@file-manager/shared';
import { ExamRepository } from '../../repositories/ExamRepository';
import { ListExamsUseCase } from './ListExamsUseCase';

// ── Factories ─────────────────────────────────────────────────────────────────

function examMock(overrides = {}) {
  return {
    id: 'exam-uuid-001',
    name: 'Hemograma',
    code: '40303630',
    category: ExamCategory.HEMATOLOGY,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    deletedAt: null,
    ...overrides,
  };
}

// ── Mock repository ───────────────────────────────────────────────────────────

const listExamsActive = jest.fn();
const countExamsActive = jest.fn();

let useCase: ListExamsUseCase;

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ListExamsUseCase', () => {
  beforeEach(() => {
    useCase = new ListExamsUseCase({
      listExamsActive,
      countExamsActive,
    } as unknown as ExamRepository);
    jest.clearAllMocks();
  });

  describe('should be able to list exams with success', () => {
    it('returns mapped data and correct meta on page 1 with no filters', async () => {
      const exams = [examMock({ id: 'e-1' }), examMock({ id: 'e-2' })];
      listExamsActive.mockResolvedValueOnce(exams);
      countExamsActive.mockResolvedValueOnce(2);

      const result = await useCase.execute({});

      expect(result.data).toHaveLength(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.skip).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
    });

    it('maps repository result to correct output shape', async () => {
      const exam = examMock({ id: 'e-x', name: 'PCR', code: '99999', category: ExamCategory.HEMATOLOGY });
      listExamsActive.mockResolvedValueOnce([exam]);
      countExamsActive.mockResolvedValueOnce(1);

      const result = await useCase.execute({});

      expect(result.data[0]).toEqual({
        id: 'e-x',
        name: 'PCR',
        code: '99999',
        category: ExamCategory.HEMATOLOGY,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
      });
    });

    it('calculates skip and hasNextPage correctly for page 2', async () => {
      listExamsActive.mockResolvedValueOnce([examMock({ id: 'e-3' }), examMock({ id: 'e-4' })]);
      countExamsActive.mockResolvedValueOnce(5);

      const result = await useCase.execute({ page: 2, limit: 2 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.skip).toBe(2);
      expect(result.meta.hasNextPage).toBe(true);
    });

    it('normalizes name and code before passing to repository', async () => {
      listExamsActive.mockResolvedValueOnce([]);
      countExamsActive.mockResolvedValueOnce(0);

      await useCase.execute({ name: '  HEMO  ', code: '  403  ' });

      expect(listExamsActive).toHaveBeenCalledWith('hemo', '403', undefined, 0, 10);
      expect(countExamsActive).toHaveBeenCalledWith('hemo', '403', undefined);
    });

    it('passes category directly to repository without normalization', async () => {
      listExamsActive.mockResolvedValueOnce([]);
      countExamsActive.mockResolvedValueOnce(0);

      await useCase.execute({ category: ExamCategory.HEMATOLOGY });

      expect(listExamsActive).toHaveBeenCalledWith(undefined, undefined, ExamCategory.HEMATOLOGY, 0, 10);
      expect(countExamsActive).toHaveBeenCalledWith(undefined, undefined, ExamCategory.HEMATOLOGY);
    });

    it('returns empty data when repository returns no results', async () => {
      listExamsActive.mockResolvedValueOnce([]);
      countExamsActive.mockResolvedValueOnce(0);

      const result = await useCase.execute({});

      expect(result.data).toHaveLength(0);
      expect(result.meta.skip).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
    });
  });
});
