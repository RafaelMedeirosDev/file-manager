import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { CreateUserUseCase } from './CreateUserUseCase';
import { UserRepository } from '../../repositories/UserRepository';
import { BCRYPT_SALT_ROUNDS } from '../../shared/constants/bcrypt.constants';

jest.mock('bcrypt', () => ({ hash: jest.fn() }));
import { hash } from 'bcrypt';

const hashMock = jest.mocked(hash);

// ── Factories ────────────────────────────────────────────
function userMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-001',
    name: 'Alice',
    email: 'alice@example.com',
    password: 'hashed',
    role: ROLE.USER,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

const input = {
  name: 'Alice',
  email: 'alice@example.com',
  password: 'plain-password',
};

// ── Mock repository ──────────────────────────────────────
const mockUserRepository = { findByEmail: jest.fn(), create: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    }).compile();

    useCase = module.get<CreateUserUseCase>(CreateUserUseCase);
    jest.clearAllMocks();
    hashMock.mockResolvedValue('hashed-password' as never);
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to create a user with success', () => {
    it('stores the hashed password and forces the USER role', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(userMock());

      await useCase.execute(input);

      expect(hashMock).toHaveBeenCalledWith(
        'plain-password',
        BCRYPT_SALT_ROUNDS,
      );
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'hashed-password',
        role: ROLE.USER,
      });
    });

    it('never returns the password field', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(userMock());

      const output = await useCase.execute(input);

      expect(output).not.toHaveProperty('password');
      expect(output).toEqual({
        id: 'user-uuid-001',
        name: 'Alice',
        email: 'alice@example.com',
        role: ROLE.USER,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to create a user if', () => {
    it('the email is already registered', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(userMock());

      await expect(useCase.execute(input)).rejects.toThrow(
        new ConflictException(ErrorMessagesEnum.EMAIL_ALREADY_REGISTERED),
      );

      // hash so acontece depois da checagem de conflito
      expect(hashMock).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });
});
