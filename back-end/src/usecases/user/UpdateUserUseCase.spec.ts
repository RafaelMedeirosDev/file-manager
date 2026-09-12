import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { UpdateUserUseCase } from './UpdateUserUseCase';
import { UserRepository } from '../../repositories/UserRepository';
import { MembershipRepository } from '../../repositories/MembershipRepository';
import { BCRYPT_SALT_ROUNDS } from '../../shared/constants/bcrypt.constants';

jest.mock('bcrypt', () => ({ hash: jest.fn() }));
import { hash } from 'bcrypt';

const ORGANIZATION_ID = 'org-uuid-principal';

const hashMock = jest.mocked(hash);

// ── Factories ────────────────────────────────────────────
function userMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-001',
    name: 'Alice',
    email: 'alice@example.com',
    role: ROLE.USER,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

/**
 * `role` e o papel NA organizacao; `userRole` e a coluna global `users.role`.
 * Separados de proposito: e a divergencia entre os dois que torna detectavel o
 * bug de ler a coluna errada.
 */
function membershipMock(
  overrides: {
    role?: ROLE;
    userRole?: ROLE;
    deletedAt?: Date | null;
    userDeletedAt?: Date | null;
  } = {},
) {
  return {
    id: 'membership-uuid-001',
    userId: 'user-uuid-001',
    organizationId: ORGANIZATION_ID,
    role: overrides.role ?? ROLE.USER,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: overrides.deletedAt ?? null,
    user: userMock({
      role: overrides.userRole ?? ROLE.USER,
      deletedAt: overrides.userDeletedAt ?? null,
    }),
    organization: {
      id: ORGANIZATION_ID,
      name: 'Organizacao Principal',
      slug: 'principal',
      deletedAt: null,
    },
  };
}

// ── Mock repository ──────────────────────────────────────
const mockUserRepository = {
  findByEmail: jest.fn(),
  updateById: jest.fn(),
};
const mockMembershipRepository = { findByUserAndOrganization: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserUseCase,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: MembershipRepository, useValue: mockMembershipRepository },
      ],
    }).compile();

    useCase = module.get<UpdateUserUseCase>(UpdateUserUseCase);
    jest.clearAllMocks();
    hashMock.mockResolvedValue('hashed-password' as never);
    mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
      membershipMock(),
    );
    mockUserRepository.updateById.mockResolvedValue(userMock());
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to update a user with success', () => {
    it('updates the email without touching bcrypt', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await useCase.execute({
        organizationId: ORGANIZATION_ID,
        id: 'user-uuid-001',
        email: 'nova@example.com',
      });

      expect(hashMock).not.toHaveBeenCalled();
      expect(mockUserRepository.updateById).toHaveBeenCalledWith(
        'user-uuid-001',
        { email: 'nova@example.com', password: undefined },
      );
    });

    it('hashes the password when one is given', async () => {
      await useCase.execute({
        organizationId: ORGANIZATION_ID,
        id: 'user-uuid-001',
        password: 'nova-senha',
      });

      expect(hashMock).toHaveBeenCalledWith('nova-senha', BCRYPT_SALT_ROUNDS);
      expect(mockUserRepository.updateById).toHaveBeenCalledWith(
        'user-uuid-001',
        { email: undefined, password: 'hashed-password' },
      );
      // sem email no input, a checagem de duplicidade nao acontece
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('accepts the email that already belongs to the user being updated', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(
        userMock({ id: 'user-uuid-001' }),
      );

      await expect(
        useCase.execute({
          organizationId: ORGANIZATION_ID,
          id: 'user-uuid-001',
          email: 'alice@example.com',
        }),
      ).resolves.toBeDefined();
    });
  });

  it('reads the role from the membership, not from users.role', async () => {
    // Divergentes de proposito: a coluna global diz USER, a associacao diz
    // ADMIN. O papel nao muda num update, entao sai da leitura inicial.
    mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
      membershipMock({ role: ROLE.ADMIN, userRole: ROLE.USER }),
    );
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.updateById.mockResolvedValue(
      userMock({ email: 'nova@example.com', role: ROLE.USER }),
    );

    const output = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      id: 'user-uuid-001',
      email: 'nova@example.com',
    });

    expect(output.role).toBe(ROLE.ADMIN);
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to update a user if', () => {
    it('no field was provided', async () => {
      await expect(
        useCase.execute({
          organizationId: ORGANIZATION_ID,
          id: 'user-uuid-001',
        }),
      ).rejects.toThrow(
        new BadRequestException(ErrorMessagesEnum.AT_LEAST_ONE_FIELD_REQUIRED),
      );

      // valida antes de ir ao repositorio
      expect(
        mockMembershipRepository.findByUserAndOrganization,
      ).not.toHaveBeenCalled();
    });

    it('the user does not exist', async () => {
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        null,
      );

      await expect(
        useCase.execute({
          organizationId: ORGANIZATION_ID,
          id: 'missing',
          email: 'nova@example.com',
        }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );
    });

    it('the user is soft-deleted', async () => {
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        membershipMock({ userDeletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(
        useCase.execute({
          organizationId: ORGANIZATION_ID,
          id: 'user-uuid-001',
          email: 'nova@example.com',
        }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );
    });

    it('the email already belongs to another user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(
        userMock({ id: 'outro-usuario' }),
      );

      await expect(
        useCase.execute({
          organizationId: ORGANIZATION_ID,
          id: 'user-uuid-001',
          email: 'nova@example.com',
        }),
      ).rejects.toThrow(
        new ConflictException(ErrorMessagesEnum.EMAIL_ALREADY_REGISTERED),
      );

      expect(mockUserRepository.updateById).not.toHaveBeenCalled();
    });
  });
});
