import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { SoftDeleteUserUseCase } from './SoftDeleteUserUseCase';
import { MembershipRepository } from '../../repositories/MembershipRepository';

const ORGANIZATION_ID = 'org-uuid-principal';
const USER_ID = 'user-uuid-001';
const NOW = new Date('2026-08-22T12:00:00.000Z');

// ── Factories ────────────────────────────────────────────
function membershipMock(
  overrides: {
    deletedAt?: Date | null;
    userDeletedAt?: Date | null;
  } = {},
) {
  return {
    id: 'membership-uuid-001',
    userId: USER_ID,
    organizationId: ORGANIZATION_ID,
    role: ROLE.USER,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: overrides.deletedAt ?? null,
    user: {
      id: USER_ID,
      name: 'Alice',
      email: 'alice@example.com',
      deletedAt: overrides.userDeletedAt ?? null,
    },
    organization: {
      id: ORGANIZATION_ID,
      name: 'Organizacao Principal',
      slug: 'principal',
      deletedAt: null,
    },
  };
}

// ── Mock repository ──────────────────────────────────────
const mockMembershipRepository = {
  findByUserAndOrganization: jest.fn(),
  softDeleteByUserAndOrganization: jest.fn(),
};

// ── Suite ────────────────────────────────────────────────
describe('SoftDeleteUserUseCase', () => {
  let useCase: SoftDeleteUserUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoftDeleteUserUseCase,
        { provide: MembershipRepository, useValue: mockMembershipRepository },
      ],
    }).compile();

    useCase = module.get<SoftDeleteUserUseCase>(SoftDeleteUserUseCase);
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW.getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to soft delete a user with success', () => {
    it('removes the membership, not the user row', async () => {
      // A garantia central deste use case. Apagar a linha de `users` mataria a
      // pessoa em TODAS as organizacoes -- e um ADMIN da organizacao de
      // demonstracao, cuja credencial e publica, poderia excluir a conta real
      // do operador.
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        membershipMock(),
      );
      mockMembershipRepository.softDeleteByUserAndOrganization.mockResolvedValue(
        membershipMock({ deletedAt: NOW }),
      );

      await useCase.execute({
        organizationId: ORGANIZATION_ID,
        id: USER_ID,
        requesterId: 'admin-uuid',
      });

      expect(
        mockMembershipRepository.softDeleteByUserAndOrganization,
      ).toHaveBeenCalledWith(USER_ID, ORGANIZATION_ID, NOW);
    });

    it('scopes the lookup to the organization of the requester', async () => {
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        membershipMock(),
      );
      mockMembershipRepository.softDeleteByUserAndOrganization.mockResolvedValue(
        membershipMock({ deletedAt: NOW }),
      );

      await useCase.execute({
        organizationId: ORGANIZATION_ID,
        id: USER_ID,
        requesterId: 'admin-uuid',
      });

      expect(
        mockMembershipRepository.findByUserAndOrganization,
      ).toHaveBeenCalledWith(USER_ID, ORGANIZATION_ID);
    });

    it('returns the user data and the deletion timestamp as ISO', async () => {
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        membershipMock(),
      );
      mockMembershipRepository.softDeleteByUserAndOrganization.mockResolvedValue(
        membershipMock({ deletedAt: NOW }),
      );

      const output = await useCase.execute({
        organizationId: ORGANIZATION_ID,
        id: USER_ID,
        requesterId: 'admin-uuid',
      });

      // O contrato de saida nao mudou: o frontend nao percebe a troca.
      expect(output).toEqual({
        id: USER_ID,
        name: 'Alice',
        email: 'alice@example.com',
        deletedAt: NOW.toISOString(),
      });
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to soft delete a user if', () => {
    it('the requester is deleting their own account', async () => {
      await expect(
        useCase.execute({
          organizationId: ORGANIZATION_ID,
          id: USER_ID,
          requesterId: USER_ID,
        }),
      ).rejects.toThrow(
        new ForbiddenException(ErrorMessagesEnum.CANNOT_DELETE_SELF),
      );

      expect(
        mockMembershipRepository.findByUserAndOrganization,
      ).not.toHaveBeenCalled();
    });

    it('the user does not belong to the organization', async () => {
      // Cobre tambem o id de usuario de outra organizacao: nao ha associacao,
      // logo 404 -- e nada revela que aquele usuario existe em outro lugar.
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        null,
      );

      await expect(
        useCase.execute({
          organizationId: ORGANIZATION_ID,
          id: 'de-outra-org',
          requesterId: 'admin-uuid',
        }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );

      expect(
        mockMembershipRepository.softDeleteByUserAndOrganization,
      ).not.toHaveBeenCalled();
    });

    it('the membership was already removed', async () => {
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        membershipMock({ deletedAt: new Date('2026-01-05T00:00:00.000Z') }),
      );

      await expect(
        useCase.execute({
          organizationId: ORGANIZATION_ID,
          id: USER_ID,
          requesterId: 'admin-uuid',
        }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );

      expect(
        mockMembershipRepository.softDeleteByUserAndOrganization,
      ).not.toHaveBeenCalled();
    });

    it('the user row itself is soft-deleted', async () => {
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        membershipMock({ userDeletedAt: new Date('2026-01-05T00:00:00.000Z') }),
      );

      await expect(
        useCase.execute({
          organizationId: ORGANIZATION_ID,
          id: USER_ID,
          requesterId: 'admin-uuid',
        }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );

      expect(
        mockMembershipRepository.softDeleteByUserAndOrganization,
      ).not.toHaveBeenCalled();
    });
  });
});
