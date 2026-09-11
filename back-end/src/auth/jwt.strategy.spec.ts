import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLE } from '@prisma/client';
import { JwtStrategy, SignedJwtClaims } from './jwt.strategy';
import { MembershipRepository } from '../repositories/MembershipRepository';

const USER_ID = 'user-uuid-001';
const ORGANIZATION_ID = 'org-uuid-principal';

const claims: SignedJwtClaims = {
  sub: USER_ID,
  email: 'user@filemanager.dev',
  organizationId: ORGANIZATION_ID,
};

// ── Factory ──────────────────────────────────────────────
function membershipMock(
  overrides: {
    role?: ROLE;
    deletedAt?: Date | null;
    userDeletedAt?: Date | null;
    organizationDeletedAt?: Date | null;
  } = {},
) {
  return {
    id: 'membership-uuid-001',
    userId: USER_ID,
    organizationId: ORGANIZATION_ID,
    role: overrides.role ?? ROLE.USER,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: overrides.deletedAt ?? null,
    user: {
      id: USER_ID,
      name: 'Usuario Comum',
      email: 'user@filemanager.dev',
      // Divergente do papel da associacao de proposito: nenhum teste aqui
      // deve depender desta coluna, que sera dropada no contract.
      role: ROLE.ADMIN,
      deletedAt: overrides.userDeletedAt ?? null,
    },
    organization: {
      id: ORGANIZATION_ID,
      name: 'Organizacao Principal',
      slug: 'principal',
      deletedAt: overrides.organizationDeletedAt ?? null,
    },
  };
}

// ── Mock ─────────────────────────────────────────────────
const mockMembershipRepository = { findByUserAndOrganization: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: MembershipRepository, useValue: mockMembershipRepository },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  describe('should accept the token if', () => {
    it('the membership is active, returning the organization in req.user', async () => {
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        membershipMock({ role: ROLE.USER }),
      );

      const output = await strategy.validate(claims);

      expect(output).toEqual({
        sub: USER_ID,
        email: 'user@filemanager.dev',
        organizationId: ORGANIZATION_ID,
        role: ROLE.USER,
      });
      // O shape e contrato: os controllers, o RolesGuard e o
      // HttpLoggingInterceptor esperam `sub`, nao `id`.
      expect(output).not.toHaveProperty('id');
      expect(output).not.toHaveProperty('password');
    });

    it('reads the role from the membership, not from users.role', async () => {
      // A associacao diz ADMIN; a linha de users, no mock, diz o contrario do
      // que a associacao diz. Quem manda e a associacao.
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        membershipMock({ role: ROLE.ADMIN }),
      );

      const output = await strategy.validate(claims);

      expect(output.role).toBe(ROLE.ADMIN);
    });

    it('looks the membership up by the pair (sub, organizationId)', async () => {
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        membershipMock(),
      );

      await strategy.validate(claims);

      expect(
        mockMembershipRepository.findByUserAndOrganization,
      ).toHaveBeenCalledWith(USER_ID, ORGANIZATION_ID);
    });
  });

  describe('should reject the token if', () => {
    it('it carries no organizationId', async () => {
      // A audiencia declarada na strategy ja recusaria este token antes de
      // validate() rodar. Esta guarda e a rede redundante, e a unica que um
      // teste unitario alcanca.
      const withoutOrganization = {
        sub: USER_ID,
        email: 'user@filemanager.dev',
      } as SignedJwtClaims;

      await expect(strategy.validate(withoutOrganization)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(
        mockMembershipRepository.findByUserAndOrganization,
      ).not.toHaveBeenCalled();
    });

    it('the membership does not exist', async () => {
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        null,
      );

      await expect(strategy.validate(claims)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('the membership is soft-deleted', async () => {
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        membershipMock({ deletedAt: new Date('2026-03-01T00:00:00.000Z') }),
      );

      await expect(strategy.validate(claims)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('the user is soft-deleted', async () => {
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        membershipMock({ userDeletedAt: new Date('2026-03-01T00:00:00.000Z') }),
      );

      await expect(strategy.validate(claims)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('the organization is soft-deleted', async () => {
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        membershipMock({
          organizationDeletedAt: new Date('2026-03-01T00:00:00.000Z'),
        }),
      );

      await expect(strategy.validate(claims)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
