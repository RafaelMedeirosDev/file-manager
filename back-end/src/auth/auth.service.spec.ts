import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcrypt';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { AuthService } from './auth.service';
import { UserRepository } from '../repositories/UserRepository';
import { BCRYPT_SALT_ROUNDS } from '../shared/constants/bcrypt.constants';

const PASSWORD = 'senha-correta';
const EMAIL = 'user@filemanager.dev';

// ── Factories ────────────────────────────────────────────
async function userMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-001',
    name: 'Usuario Comum',
    email: EMAIL,
    password: await hash(PASSWORD, BCRYPT_SALT_ROUNDS),
    role: ROLE.USER,
    deletedAt: null,
    ...overrides,
  };
}

// ── Mocks ────────────────────────────────────────────────
const mockUserRepository = { findByEmail: jest.fn() };
const mockJwtService = { signAsync: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtService.signAsync.mockResolvedValue('signed-token');
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to log in with success', () => {
    it('signs the token with sub, email and role, and never returns the hash', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(await userMock());

      const output = await service.login({
        email: EMAIL,
        password: PASSWORD,
      });

      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-uuid-001',
        email: EMAIL,
        role: ROLE.USER,
      });
      expect(output.accessToken).toBe('signed-token');
      expect(output.user).toEqual({
        id: 'user-uuid-001',
        name: 'Usuario Comum',
        email: EMAIL,
        role: ROLE.USER,
      });
      expect(output.user).not.toHaveProperty('password');
    });
  });

  // ── Error cases ────────────────────────────────────────
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

    it('reports the same message for every failure, to not reveal which emails exist', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      const missing = await service
        .login({ email: 'ninguem@x.dev', password: PASSWORD })
        .catch((error: Error) => error.message);

      mockUserRepository.findByEmail.mockResolvedValue(await userMock());
      const wrongPassword = await service
        .login({ email: EMAIL, password: 'senha-errada' })
        .catch((error: Error) => error.message);

      expect(missing).toBe(wrongPassword);
    });
  });
});
