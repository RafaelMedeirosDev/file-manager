import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLE } from '@prisma/client';
import { JwtStrategy, type JwtPayload } from './jwt.strategy';
import { UserRepository } from '../repositories/UserRepository';

const payload: JwtPayload = {
  sub: 'user-uuid-001',
  email: 'user@filemanager.dev',
  role: ROLE.USER,
};

// ── Factory ──────────────────────────────────────────────
function userMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-001',
    name: 'Usuario Comum',
    email: 'user@filemanager.dev',
    password: 'hash-que-nao-pode-vazar',
    role: ROLE.USER,
    deletedAt: null,
    ...overrides,
  };
}

// ── Mock ─────────────────────────────────────────────────
const mockUserRepository = { findById: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  describe('should accept the token if', () => {
    it('the user still exists, keeping the sub/email/role shape', async () => {
      mockUserRepository.findById.mockResolvedValue(userMock());

      const output = await strategy.validate(payload);

      // O shape e contrato: controllers, RolesGuard e o interceptor de log
      // leem `sub`. Devolver a entidade do Prisma quebraria os tres.
      expect(output).toEqual({
        sub: 'user-uuid-001',
        email: 'user@filemanager.dev',
        role: ROLE.USER,
      });
      expect(output).not.toHaveProperty('password');
      expect(output).not.toHaveProperty('id');
    });

    it('reads the role from the database, not from the token', async () => {
      // Token antigo diz USER, banco ja diz ADMIN: vale o banco.
      mockUserRepository.findById.mockResolvedValue(
        userMock({ role: ROLE.ADMIN }),
      );

      const output = await strategy.validate(payload);

      expect(output.role).toBe(ROLE.ADMIN);
    });
  });

  describe('should reject the token if', () => {
    it('the user no longer exists', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('the user was soft-deleted after the token was issued', async () => {
      // O ponto central desta mudanca: antes o token seguia valido ate expirar.
      mockUserRepository.findById.mockResolvedValue(
        userMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('looks the user up by the sub claim', async () => {
      mockUserRepository.findById.mockResolvedValue(userMock());

      await strategy.validate(payload);

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-uuid-001');
    });
  });
});
