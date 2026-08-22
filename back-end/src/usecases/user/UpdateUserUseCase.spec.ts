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
    role: ROLE.USER,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

// ── Mock repository ──────────────────────────────────────
const mockUserRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  updateById: jest.fn(),
};

// ── Suite ────────────────────────────────────────────────
describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserUseCase,
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    }).compile();

    useCase = module.get<UpdateUserUseCase>(UpdateUserUseCase);
    jest.clearAllMocks();
    hashMock.mockResolvedValue('hashed-password' as never);
    mockUserRepository.findById.mockResolvedValue(userMock());
    mockUserRepository.updateById.mockResolvedValue(userMock());
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to update a user with success', () => {
    it('updates the email without touching bcrypt', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await useCase.execute({ id: 'user-uuid-001', email: 'nova@example.com' });

      expect(hashMock).not.toHaveBeenCalled();
      expect(mockUserRepository.updateById).toHaveBeenCalledWith(
        'user-uuid-001',
        { email: 'nova@example.com', password: undefined },
      );
    });

    it('hashes the password when one is given', async () => {
      await useCase.execute({ id: 'user-uuid-001', password: 'nova-senha' });

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
        useCase.execute({ id: 'user-uuid-001', email: 'alice@example.com' }),
      ).resolves.toBeDefined();
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to update a user if', () => {
    it('no field was provided', async () => {
      await expect(useCase.execute({ id: 'user-uuid-001' })).rejects.toThrow(
        new BadRequestException(ErrorMessagesEnum.AT_LEAST_ONE_FIELD_REQUIRED),
      );

      // valida antes de ir ao repositorio
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('the user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ id: 'missing', email: 'nova@example.com' }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );
    });

    it('the user is soft-deleted', async () => {
      mockUserRepository.findById.mockResolvedValue(
        userMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(
        useCase.execute({ id: 'user-uuid-001', email: 'nova@example.com' }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );
    });

    it('the email already belongs to another user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(
        userMock({ id: 'outro-usuario' }),
      );

      await expect(
        useCase.execute({ id: 'user-uuid-001', email: 'nova@example.com' }),
      ).rejects.toThrow(
        new ConflictException(ErrorMessagesEnum.EMAIL_ALREADY_REGISTERED),
      );

      expect(mockUserRepository.updateById).not.toHaveBeenCalled();
    });
  });
});
