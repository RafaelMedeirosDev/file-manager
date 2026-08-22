import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { SoftDeleteUserUseCase } from './SoftDeleteUserUseCase';
import { UserRepository } from '../../repositories/UserRepository';

const NOW = new Date('2026-08-22T12:00:00.000Z');

// ── Factories ────────────────────────────────────────────
function userMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-001',
    name: 'Alice',
    email: 'alice@example.com',
    deletedAt: null,
    ...overrides,
  };
}

// ── Mock repository ──────────────────────────────────────
const mockUserRepository = { findById: jest.fn(), softDeleteById: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('SoftDeleteUserUseCase', () => {
  let useCase: SoftDeleteUserUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoftDeleteUserUseCase,
        { provide: UserRepository, useValue: mockUserRepository },
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
    it('passes the generated date to the repository and returns it as ISO', async () => {
      mockUserRepository.findById.mockResolvedValue(userMock());
      mockUserRepository.softDeleteById.mockResolvedValue(userMock());

      const output = await useCase.execute({
        id: 'user-uuid-001',
        requesterId: 'admin-uuid',
      });

      expect(mockUserRepository.softDeleteById).toHaveBeenCalledWith(
        'user-uuid-001',
        NOW,
      );
      expect(output).toEqual({
        id: 'user-uuid-001',
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
        useCase.execute({ id: 'user-uuid-001', requesterId: 'user-uuid-001' }),
      ).rejects.toThrow(
        new ForbiddenException(ErrorMessagesEnum.CANNOT_DELETE_SELF),
      );

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('the user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ id: 'missing', requesterId: 'admin-uuid' }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );

      expect(mockUserRepository.softDeleteById).not.toHaveBeenCalled();
    });

    it('the user is already soft-deleted', async () => {
      mockUserRepository.findById.mockResolvedValue(
        userMock({ deletedAt: new Date('2026-01-05T00:00:00.000Z') }),
      );

      await expect(
        useCase.execute({ id: 'user-uuid-001', requesterId: 'admin-uuid' }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );

      expect(mockUserRepository.softDeleteById).not.toHaveBeenCalled();
    });
  });
});
