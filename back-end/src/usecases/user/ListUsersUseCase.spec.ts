import { ROLE } from '@prisma/client';
import { UserRepository } from '../../repositories/UserRepository';
import { ListUsersUseCase } from './ListUsersUseCase';

// ── Factories ─────────────────────────────────────────────────────────────────

function userMock(overrides = {}) {
  return {
    id: 'user-uuid-001',
    name: 'Alice',
    email: 'alice@example.com',
    password: 'hashed',
    role: ROLE.USER,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    deletedAt: null,
    ...overrides,
  };
}

// ── Mock repository ───────────────────────────────────────────────────────────

const listUsersActive = jest.fn();
const countActiveUsers = jest.fn();

let useCase: ListUsersUseCase;

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ListUsersUseCase', () => {
  beforeEach(() => {
    useCase = new ListUsersUseCase({
      listUsersActive,
      countActiveUsers,
    } as unknown as UserRepository);
    jest.clearAllMocks();
  });

  describe('should be able to list users with success', () => {
    it('returns mapped data and correct meta on page 1 with no filters', async () => {
      const users = [userMock({ id: 'u-1' }), userMock({ id: 'u-2' })];
      listUsersActive.mockResolvedValueOnce(users);
      countActiveUsers.mockResolvedValueOnce(2);

      const result = await useCase.execute({});

      expect(result.data).toHaveLength(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(2);
      expect(result.meta.hasNextPage).toBe(false);
    });

    it('maps repository result to correct output shape', async () => {
      const user = userMock({ id: 'u-x', name: 'Bob', email: 'bob@example.com', role: ROLE.ADMIN });
      listUsersActive.mockResolvedValueOnce([user]);
      countActiveUsers.mockResolvedValueOnce(1);

      const result = await useCase.execute({});

      expect(result.data[0]).toEqual({
        id: 'u-x',
        name: 'Bob',
        email: 'bob@example.com',
        role: ROLE.ADMIN,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    });

    it('calculates skip and hasNextPage correctly for page 2', async () => {
      listUsersActive.mockResolvedValueOnce([userMock({ id: 'u-3' }), userMock({ id: 'u-4' })]);
      countActiveUsers.mockResolvedValueOnce(5);

      const result = await useCase.execute({ page: 2, limit: 2 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.total).toBe(5);
      expect(result.meta.hasNextPage).toBe(true);
    });

    it('normalizes search and passes it to repository methods', async () => {
      listUsersActive.mockResolvedValueOnce([]);
      countActiveUsers.mockResolvedValueOnce(0);

      await useCase.execute({ search: '  ANA  ' });

      expect(listUsersActive).toHaveBeenCalledWith('ana', 0, 10);
      expect(countActiveUsers).toHaveBeenCalledWith('ana');
    });

    it('passes undefined search when no search is provided', async () => {
      listUsersActive.mockResolvedValueOnce([]);
      countActiveUsers.mockResolvedValueOnce(0);

      await useCase.execute({});

      expect(listUsersActive).toHaveBeenCalledWith(undefined, 0, 10);
      expect(countActiveUsers).toHaveBeenCalledWith(undefined);
    });

    it('returns empty data when repository returns no results', async () => {
      listUsersActive.mockResolvedValueOnce([]);
      countActiveUsers.mockResolvedValueOnce(0);

      const result = await useCase.execute({});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
    });
  });
});
