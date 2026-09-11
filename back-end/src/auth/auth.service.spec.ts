import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcrypt';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { AuthService } from './auth.service';
import { UserRepository } from '../repositories/UserRepository';
import { MembershipRepository } from '../repositories/MembershipRepository';
import { BCRYPT_SALT_ROUNDS } from '../shared/constants/bcrypt.constants';
import {
  PRE_AUTH_TOKEN_EXPIRES_IN,
  TOKEN_AUDIENCE,
} from '../shared/constants/token.constants';

const PASSWORD = 'senha-correta';
const EMAIL = 'user@filemanager.dev';
const USER_ID = 'user-uuid-001';
const PRINCIPAL_ID = 'org-uuid-principal';
const DEMO_ID = 'org-uuid-demo';

// ── Factories ────────────────────────────────────────────
async function userMock(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    name: 'Usuario Comum',
    email: EMAIL,
    password: await hash(PASSWORD, BCRYPT_SALT_ROUNDS),
    role: ROLE.USER,
    deletedAt: null,
    ...overrides,
  };
}

/**
 * Espelha o shape de MembershipWithUserAndOrganization. O `user` aqui nao
 * precisa da senha: o service so le id, name, email e deletedAt dele.
 */
function membershipMock(overrides: {
  organizationId?: string;
  organizationName?: string;
  organizationSlug?: string;
  role?: ROLE;
  deletedAt?: Date | null;
  userDeletedAt?: Date | null;
  organizationDeletedAt?: Date | null;
  userRole?: ROLE;
}) {
  const organizationId = overrides.organizationId ?? PRINCIPAL_ID;

  return {
    id: `membership-${organizationId}`,
    userId: USER_ID,
    organizationId,
    role: overrides.role ?? ROLE.USER,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: overrides.deletedAt ?? null,
    user: {
      id: USER_ID,
      name: 'Usuario Comum',
      email: EMAIL,
      // `users.role` existe ainda mas nao deve ser lido: os testes de papel
      // abaixo dependem de ele poder divergir do papel da associacao.
      role: overrides.userRole ?? ROLE.USER,
      deletedAt: overrides.userDeletedAt ?? null,
    },
    organization: {
      id: organizationId,
      name: overrides.organizationName ?? 'Organizacao Principal',
      slug: overrides.organizationSlug ?? 'principal',
      deletedAt: overrides.organizationDeletedAt ?? null,
    },
  };
}

// ── Mocks ────────────────────────────────────────────────
const mockUserRepository = { findByEmail: jest.fn(), findById: jest.fn() };
const mockMembershipRepository = {
  listActiveByUserId: jest.fn(),
  findByUserAndOrganization: jest.fn(),
};
const mockJwtService = { signAsync: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: MembershipRepository, useValue: mockMembershipRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtService.signAsync.mockResolvedValue('signed-token');
  });

  // ── Passo 1: uma organizacao ───────────────────────────
  describe('login with a single active membership', () => {
    it('returns the session directly, without asking for a choice', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(await userMock());
      mockMembershipRepository.listActiveByUserId.mockResolvedValue([
        membershipMock({ role: ROLE.USER }),
      ]);

      const output = await service.login({ email: EMAIL, password: PASSWORD });

      expect(output.status).toBe('authenticated');
      if (output.status !== 'authenticated') return;

      expect(output.accessToken).toBe('signed-token');
      expect(output.user).toEqual({
        id: USER_ID,
        name: 'Usuario Comum',
        email: EMAIL,
        role: ROLE.USER,
      });
      expect(output.organization).toEqual({
        id: PRINCIPAL_ID,
        name: 'Organizacao Principal',
        slug: 'principal',
      });
      expect(output.user).not.toHaveProperty('password');
    });

    it('signs organizationId into the claims and keeps role out of them', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(await userMock());
      mockMembershipRepository.listActiveByUserId.mockResolvedValue([
        membershipMock({ role: ROLE.ADMIN }),
      ]);

      await service.login({ email: EMAIL, password: PASSWORD });

      // O papel fica fora do token de proposito: e lido da associacao a cada
      // requisicao, entao rebaixar alguem vale na hora em vez de esperar o
      // token expirar.
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: USER_ID, email: EMAIL, organizationId: PRINCIPAL_ID },
        { audience: TOKEN_AUDIENCE.API },
      );

      const [claims] = mockJwtService.signAsync.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(claims).not.toHaveProperty('role');
    });

    it('reads the role from the membership, not from users.role', async () => {
      // A linha de users diz USER; a associacao diz ADMIN. Depois da migracao
      // do papel para a associacao, quem manda e a associacao -- e este e o
      // teste que prova que a mudanca de lugar realmente aconteceu.
      mockUserRepository.findByEmail.mockResolvedValue(
        await userMock({ role: ROLE.USER }),
      );
      mockMembershipRepository.listActiveByUserId.mockResolvedValue([
        membershipMock({ role: ROLE.ADMIN, userRole: ROLE.USER }),
      ]);

      const output = await service.login({ email: EMAIL, password: PASSWORD });

      if (output.status !== 'authenticated') {
        throw new Error('esperava sessao autenticada');
      }
      expect(output.user.role).toBe(ROLE.ADMIN);
    });
  });

  // ── Passo 1: duas organizacoes ─────────────────────────
  describe('login with two or more active memberships', () => {
    beforeEach(async () => {
      mockUserRepository.findByEmail.mockResolvedValue(await userMock());
      mockMembershipRepository.listActiveByUserId.mockResolvedValue([
        membershipMock({ role: ROLE.ADMIN }),
        membershipMock({
          organizationId: DEMO_ID,
          organizationName: 'Demonstracao',
          organizationSlug: 'demo',
          role: ROLE.USER,
        }),
      ]);
    });

    it('asks which organization to enter, with the role of each one', async () => {
      const output = await service.login({ email: EMAIL, password: PASSWORD });

      expect(output.status).toBe('organization_required');
      if (output.status !== 'organization_required') return;

      expect(output.preAuthToken).toBe('signed-token');
      expect(output.organizations).toEqual([
        {
          id: PRINCIPAL_ID,
          name: 'Organizacao Principal',
          slug: 'principal',
          role: ROLE.ADMIN,
        },
        {
          id: DEMO_ID,
          name: 'Demonstracao',
          slug: 'demo',
          role: ROLE.USER,
        },
      ]);
      expect(output.user).toEqual({
        id: USER_ID,
        name: 'Usuario Comum',
        email: EMAIL,
      });
    });

    it('issues a short-lived token of the pre-auth audience, with no organization', async () => {
      await service.login({ email: EMAIL, password: PASSWORD });

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: USER_ID, email: EMAIL },
        {
          audience: TOKEN_AUDIENCE.PRE_AUTH,
          expiresIn: PRE_AUTH_TOKEN_EXPIRES_IN,
        },
      );

      const [claims] = mockJwtService.signAsync.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(claims).not.toHaveProperty('organizationId');
    });

    it('does not leak the role outside the organizations list', async () => {
      const output = await service.login({ email: EMAIL, password: PASSWORD });

      if (output.status !== 'organization_required') {
        throw new Error('esperava escolha de organizacao');
      }
      expect(output.user).not.toHaveProperty('role');
    });
  });

  // ── Passo 1: falhas ────────────────────────────────────
  describe('should not be able to log in if', () => {
    it('the email does not exist', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ninguem@x.dev', password: PASSWORD }),
      ).rejects.toThrow(
        new UnauthorizedException(ErrorMessagesEnum.INVALID_EMAIL_OR_PASSWORD),
      );

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('the password does not match', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(await userMock());

      await expect(
        service.login({ email: EMAIL, password: 'senha-errada' }),
      ).rejects.toThrow(
        new UnauthorizedException(ErrorMessagesEnum.INVALID_EMAIL_OR_PASSWORD),
      );

      // A senha e conferida antes de qualquer consulta de associacao.
      expect(
        mockMembershipRepository.listActiveByUserId,
      ).not.toHaveBeenCalled();
    });

    it('the user is soft-deleted, even with the right password', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(
        await userMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(
        service.login({ email: EMAIL, password: PASSWORD }),
      ).rejects.toThrow(
        new UnauthorizedException(ErrorMessagesEnum.INVALID_EMAIL_OR_PASSWORD),
      );

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('the credential is valid but there is no active membership', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(await userMock());
      mockMembershipRepository.listActiveByUserId.mockResolvedValue([]);

      await expect(
        service.login({ email: EMAIL, password: PASSWORD }),
      ).rejects.toThrow(
        new UnauthorizedException(ErrorMessagesEnum.INVALID_EMAIL_OR_PASSWORD),
      );

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('reports the same message for every failure, to not reveal which emails exist', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      const missing = await service
        .login({ email: 'ninguem@x.dev', password: PASSWORD })
        .catch((error: Error) => error.message);

      mockUserRepository.findByEmail.mockResolvedValue(await userMock());
      const wrongPassword = await service
        .login({ email: EMAIL, password: 'senha-errada' })
        .catch((error: Error) => error.message);

      mockMembershipRepository.listActiveByUserId.mockResolvedValue([]);
      const noMembership = await service
        .login({ email: EMAIL, password: PASSWORD })
        .catch((error: Error) => error.message);

      // Incluindo "sem associacao": uma conta valida sem vinculo nao deve se
      // distinguir de uma conta que nao existe.
      expect(missing).toBe(wrongPassword);
      expect(noMembership).toBe(wrongPassword);
    });
  });

  // ── Passo 2 ────────────────────────────────────────────
  describe('createTokenForOrganization', () => {
    it('issues the session token for the chosen organization', async () => {
      mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
        membershipMock({
          organizationId: DEMO_ID,
          organizationName: 'Demonstracao',
          organizationSlug: 'demo',
          role: ROLE.ADMIN,
        }),
      );

      const output = await service.createTokenForOrganization(USER_ID, DEMO_ID);

      expect(
        mockMembershipRepository.findByUserAndOrganization,
      ).toHaveBeenCalledWith(USER_ID, DEMO_ID);
      expect(output.status).toBe('authenticated');
      expect(output.user.role).toBe(ROLE.ADMIN);
      expect(output.organization).toEqual({
        id: DEMO_ID,
        name: 'Demonstracao',
        slug: 'demo',
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: USER_ID, email: EMAIL, organizationId: DEMO_ID },
        { audience: TOKEN_AUDIENCE.API },
      );
    });

    // Os quatro modos de falha respondem 403 com a MESMA mensagem: separa-los
    // deixaria quem tem uma credencial valida descobrir quais organizacoes
    // existem.
    const forbiddenCases: Array<[string, unknown]> = [
      ['the user is not a member of the organization', null],
      [
        'the membership is soft-deleted',
        membershipMock({ deletedAt: new Date('2026-03-01T00:00:00.000Z') }),
      ],
      [
        'the user is soft-deleted',
        membershipMock({ userDeletedAt: new Date('2026-03-01T00:00:00.000Z') }),
      ],
      [
        'the organization is soft-deleted',
        membershipMock({
          organizationDeletedAt: new Date('2026-03-01T00:00:00.000Z'),
        }),
      ],
    ];

    it.each(forbiddenCases)(
      'rejects with 403 when %s',
      async (_label, membership) => {
        mockMembershipRepository.findByUserAndOrganization.mockResolvedValue(
          membership,
        );

        await expect(
          service.createTokenForOrganization(USER_ID, PRINCIPAL_ID),
        ).rejects.toThrow(
          new ForbiddenException(
            ErrorMessagesEnum.ORGANIZATION_ACCESS_FORBIDDEN,
          ),
        );

        expect(mockJwtService.signAsync).not.toHaveBeenCalled();
      },
    );
  });
});
