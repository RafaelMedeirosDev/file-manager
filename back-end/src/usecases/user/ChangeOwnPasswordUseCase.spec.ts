import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { ChangeOwnPasswordUseCase } from './ChangeOwnPasswordUseCase';
import { UserRepository } from '../../repositories/UserRepository';
import { BCRYPT_SALT_ROUNDS } from '../../shared/constants/bcrypt.constants';

jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));
import { compare, hash } from 'bcrypt';

const ORGANIZATION_ID = 'org-uuid-principal';

const compareMock = jest.mocked(compare);
const hashMock = jest.mocked(hash);

// ── Factories ────────────────────────────────────────────
function userMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-001',
    email: 'alice@example.com',
    password: 'hash-da-senha-atual',
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

const input = {
  organizationId: ORGANIZATION_ID,
  userId: 'user-uuid-001',
  currentPassword: 'senha-atual',
  newPassword: 'senha-nova',
  confirmNewPassword: 'senha-nova',
};

// ── Mock repository ──────────────────────────────────────
const mockUserRepository = { findById: jest.fn(), updateById: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('ChangeOwnPasswordUseCase', () => {
  let useCase: ChangeOwnPasswordUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeOwnPasswordUseCase,
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    }).compile();

    useCase = module.get<ChangeOwnPasswordUseCase>(ChangeOwnPasswordUseCase);
    jest.clearAllMocks();
    mockUserRepository.findById.mockResolvedValue(userMock());
    mockUserRepository.updateById.mockResolvedValue(userMock());
    hashMock.mockResolvedValue('hash-da-senha-nova' as never);
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to change own password with success', () => {
    it('stores the new hash and returns without any password field', async () => {
      // 1a compare: senha atual confere. 2a compare: nova e diferente da atual.
      compareMock
        .mockResolvedValueOnce(true as never)
        .mockResolvedValueOnce(false as never);

      const output = await useCase.execute(input);

      expect(hashMock).toHaveBeenCalledWith('senha-nova', BCRYPT_SALT_ROUNDS);
      expect(mockUserRepository.updateById).toHaveBeenCalledWith(
        'user-uuid-001',
        { password: 'hash-da-senha-nova' },
      );
      expect(output).toEqual({
        id: 'user-uuid-001',
        email: 'alice@example.com',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      });
      expect(output).not.toHaveProperty('password');
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to change own password if', () => {
    it('the user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );
    });

    it('the user is soft-deleted', async () => {
      mockUserRepository.findById.mockResolvedValue(
        userMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );
    });

    it('the confirmation does not match the new password', async () => {
      await expect(
        useCase.execute({ ...input, confirmNewPassword: 'outra-coisa' }),
      ).rejects.toThrow(
        new BadRequestException(
          ErrorMessagesEnum.PASSWORD_CONFIRMATION_DOES_NOT_MATCH,
        ),
      );

      // a confirmacao e checada antes de qualquer compare
      expect(compareMock).not.toHaveBeenCalled();
    });

    it('the current password is wrong', async () => {
      compareMock.mockResolvedValueOnce(false as never);

      await expect(useCase.execute(input)).rejects.toThrow(
        new UnauthorizedException(ErrorMessagesEnum.INVALID_CURRENT_PASSWORD),
      );

      expect(compareMock).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.updateById).not.toHaveBeenCalled();
    });

    it('the new password is the same as the current one', async () => {
      compareMock
        .mockResolvedValueOnce(true as never)
        .mockResolvedValueOnce(true as never);

      await expect(useCase.execute(input)).rejects.toThrow(
        new BadRequestException(
          ErrorMessagesEnum.NEW_PASSWORD_MUST_BE_DIFFERENT,
        ),
      );

      expect(hashMock).not.toHaveBeenCalled();
      expect(mockUserRepository.updateById).not.toHaveBeenCalled();
    });
  });
});
