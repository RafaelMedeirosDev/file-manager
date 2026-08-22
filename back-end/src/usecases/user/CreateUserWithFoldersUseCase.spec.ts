import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { CreateUserWithFoldersUseCase } from './CreateUserWithFoldersUseCase';
import { UserRepository } from '../../repositories/UserRepository';
import { FolderRepository } from '../../repositories/FolderRepository';

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
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function folderMock(overrides: Record<string, unknown> = {}) {
  return { id: 'folder-default', name: 'Alice', ...overrides };
}

const input = {
  name: 'Alice',
  email: 'alice@example.com',
  password: 'plain-password',
};

// ── Mock repositories ────────────────────────────────────
const mockUserRepository = { findByEmail: jest.fn(), create: jest.fn() };
const mockFolderRepository = {
  create: jest.fn(),
  findActiveByUserIdAndName: jest.fn(),
};

// ── Suite ────────────────────────────────────────────────
describe('CreateUserWithFoldersUseCase', () => {
  let useCase: CreateUserWithFoldersUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserWithFoldersUseCase,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: FolderRepository, useValue: mockFolderRepository },
      ],
    }).compile();

    useCase = module.get<CreateUserWithFoldersUseCase>(
      CreateUserWithFoldersUseCase,
    );
    jest.clearAllMocks();
    hashMock.mockResolvedValue('hashed-password' as never);
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.create.mockResolvedValue(userMock());
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to create a user with folders with success', () => {
    it('always creates the default folder named after the user', async () => {
      mockFolderRepository.create.mockResolvedValue(folderMock());

      const output = await useCase.execute(input);

      expect(mockFolderRepository.create).toHaveBeenCalledTimes(1);
      expect(mockFolderRepository.create).toHaveBeenCalledWith({
        name: 'Alice',
        userId: 'user-uuid-001',
        isDefault: true,
      });
      expect(output.folders).toEqual([{ id: 'folder-default', name: 'Alice' }]);
    });

    it('creates the extra folders without the isDefault flag', async () => {
      mockFolderRepository.findActiveByUserIdAndName.mockResolvedValue(null);
      mockFolderRepository.create
        .mockResolvedValueOnce(folderMock())
        .mockResolvedValueOnce(
          folderMock({ id: 'folder-exams', name: 'Exames' }),
        );

      const output = await useCase.execute({ ...input, folders: ['Exames'] });

      expect(mockFolderRepository.create).toHaveBeenLastCalledWith({
        name: 'Exames',
        userId: 'user-uuid-001',
      });
      expect(output.folders).toEqual([
        { id: 'folder-default', name: 'Alice' },
        { id: 'folder-exams', name: 'Exames' },
      ]);
    });

    it('skips a duplicated folder name instead of failing the whole creation', async () => {
      mockFolderRepository.findActiveByUserIdAndName.mockResolvedValue(
        folderMock({ id: 'folder-existing', name: 'Exames' }),
      );
      mockFolderRepository.create.mockResolvedValueOnce(folderMock());

      const output = await useCase.execute({ ...input, folders: ['Exames'] });

      // apenas a pasta default foi criada
      expect(mockFolderRepository.create).toHaveBeenCalledTimes(1);
      expect(output.folders).toHaveLength(1);
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to create a user with folders if', () => {
    it('the email is already registered', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(userMock());

      await expect(useCase.execute(input)).rejects.toThrow(
        new ConflictException(ErrorMessagesEnum.EMAIL_ALREADY_REGISTERED),
      );

      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockFolderRepository.create).not.toHaveBeenCalled();
    });
  });
});
