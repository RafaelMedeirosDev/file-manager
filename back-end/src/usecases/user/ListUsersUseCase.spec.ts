import { ROLE } from '@prisma/client';
import { UserRepository } from '../../repositories/UserRepository';
import { ListUsersUseCase } from './ListUsersUseCase';

const ORGANIZATION_ID = 'org-uuid-principal';

// ── Factories ─────────────────────────────────────────────────────────────────

/**
 * `role` e o papel NA organizacao (memberships[0]); `userRole` e a coluna
 * global `users.role`. Sao parametros separados de proposito: e a divergencia
 * entre os dois que torna detectavel o bug de ler a coluna errada. Uma factory
 * com um campo so passaria nos dois estados do codigo.
 */
function userMock(
  overrides: {
    id?: string;
    name?: string;
    email?: string;
    role?: ROLE;
    userRole?: ROLE;
  } = {},
) {
  return {
    id: overrides.id ?? 'user-uuid-001',
    name: overrides.name ?? 'Alice',
    email: overrides.email ?? 'alice@example.com',
    password: 'hashed',
    role: overrides.userRole ?? ROLE.USER,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    deletedAt: null,
    memberships: [{ role: overrides.role ?? ROLE.USER }],
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

  it('reads the role from the membership, not from users.role', async () => {
    // Divergentes de proposito: a coluna global diz USER, a associacao desta
    // organizacao diz ADMIN. Quem manda e a associacao.
    listUsersActive.mockResolvedValueOnce([
      userMock({ role: ROLE.ADMIN, userRole: ROLE.USER }),
    ]);
    countActiveUsers.mockResolvedValueOnce(1);

    const result = await useCase.execute({ organizationId: ORGANIZATION_ID });

    expect(result.data[0].role).toBe(ROLE.ADMIN);
  });

  describe('should be able to list users with success', () => {
    it('returns mapped data and correct meta on page 1 with no filters', async () => {
      const users = [userMock({ id: 'u-1' }), userMock({ id: 'u-2' })];
      listUsersActive.mockResolvedValueOnce(users);
      countActiveUsers.mockResolvedValueOnce(2);

      const result = await useCase.execute({ organizationId: ORGANIZATION_ID });

      expect(result.data).toHaveLength(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(2);
      expect(result.meta.hasNextPage).toBe(false);
    });

    it('maps repository result to correct output shape', async () => {
      const user = userMock({
        id: 'u-x',
        name: 'Bob',
        email: 'bob@example.com',
        role: ROLE.ADMIN,
      });
      listUsersActive.mockResolvedValueOnce([user]);
      countActiveUsers.mockResolvedValueOnce(1);

      const result = await useCase.execute({ organizationId: ORGANIZATION_ID });

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
      listUsersActive.mockResolvedValueOnce([
        userMock({ id: 'u-3' }),
        userMock({ id: 'u-4' }),
      ]);
      countActiveUsers.mockResolvedValueOnce(5);

      const result = await useCase.execute({
        organizationId: ORGANIZATION_ID,
        page: 2,
        limit: 2,
      });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.total).toBe(5);
      expect(result.meta.hasNextPage).toBe(true);
    });

    it('normalizes search and passes it to repository methods', async () => {
      listUsersActive.mockResolvedValueOnce([]);
      countActiveUsers.mockResolvedValueOnce(0);

      await useCase.execute({
        organizationId: ORGANIZATION_ID,
        search: '  ANA  ',
      });

      expect(listUsersActive).toHaveBeenCalledWith({
        organizationId: ORGANIZATION_ID,
        search: 'ana',
        skip: 0,
        take: 10,
      });
      expect(countActiveUsers).toHaveBeenCalledWith({
        organizationId: ORGANIZATION_ID,
        search: 'ana',
      });
    });

    it('passes undefined search when no search is provided', async () => {
      listUsersActive.mockResolvedValueOnce([]);
      countActiveUsers.mockResolvedValueOnce(0);

      await useCase.execute({ organizationId: ORGANIZATION_ID });

      expect(listUsersActive).toHaveBeenCalledWith({
        organizationId: ORGANIZATION_ID,
        search: undefined,
        skip: 0,
        take: 10,
      });
      expect(countActiveUsers).toHaveBeenCalledWith({
        organizationId: ORGANIZATION_ID,
        search: undefined,
      });
    });

    it('returns empty data when repository returns no results', async () => {
      listUsersActive.mockResolvedValueOnce([]);
      countActiveUsers.mockResolvedValueOnce(0);

      const result = await useCase.execute({ organizationId: ORGANIZATION_ID });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
    });
  });
});
