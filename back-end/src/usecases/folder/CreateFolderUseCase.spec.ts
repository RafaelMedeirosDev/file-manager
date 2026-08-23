import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { CreateFolderUseCase } from './CreateFolderUseCase';
import { UserRepository } from '../../repositories/UserRepository';
import { FolderRepository } from '../../repositories/FolderRepository';

// ── Factories ────────────────────────────────────────────
function userMock(overrides: Record<string, unknown> = {}) {
  return { id: 'user-uuid-001', name: 'Alice', deletedAt: null, ...overrides };
}

function folderMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'folder-uuid-001',
    name: 'Exames',
    userId: 'user-uuid-001',
    folderId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

const input = { name: 'Exames', userId: 'user-uuid-001' };

// ── Mock repositories ────────────────────────────────────
const mockUserRepository = { findById: jest.fn() };
const mockFolderRepository = {
  findById: jest.fn(),
  findActiveByUserIdAndName: jest.fn(),
  create: jest.fn(),
};

// ── Suite ────────────────────────────────────────────────
describe('CreateFolderUseCase', () => {
  let useCase: CreateFolderUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateFolderUseCase,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: FolderRepository, useValue: mockFolderRepository },
      ],
    }).compile();

    useCase = module.get<CreateFolderUseCase>(CreateFolderUseCase);
    jest.clearAllMocks();
    mockUserRepository.findById.mockResolvedValue(userMock());
    mockFolderRepository.findActiveByUserIdAndName.mockResolvedValue(null);
    mockFolderRepository.create.mockResolvedValue(folderMock());
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to create a folder with success', () => {
    it('creates a root folder without looking up a parent', async () => {
      const output = await useCase.execute(input);

      expect(mockFolderRepository.findById).not.toHaveBeenCalled();
      expect(mockFolderRepository.create).toHaveBeenCalledWith({
        name: 'Exames',
        userId: 'user-uuid-001',
        folderId: undefined,
      });
      expect(output).toEqual({
        id: 'folder-uuid-001',
        name: 'Exames',
        userId: 'user-uuid-001',
        folderId: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    });

    it('validates the parent folder when folderId is given', async () => {
      mockFolderRepository.findById.mockResolvedValue(
        folderMock({ id: 'folder-parent' }),
      );

      await useCase.execute({ ...input, folderId: 'folder-parent' });

      expect(mockFolderRepository.findById).toHaveBeenCalledWith(
        'folder-parent',
      );
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to create a folder if', () => {
    it('the owner does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );

      expect(mockFolderRepository.create).not.toHaveBeenCalled();
    });

    it('the owner is soft-deleted', async () => {
      mockUserRepository.findById.mockResolvedValue(
        userMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );
    });

    it('the parent folder does not exist', async () => {
      mockFolderRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ ...input, folderId: 'missing' }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND),
      );
    });

    it('the parent folder is soft-deleted', async () => {
      mockFolderRepository.findById.mockResolvedValue(
        folderMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(
        useCase.execute({ ...input, folderId: 'folder-parent' }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND),
      );
    });

    it('the parent folder belongs to another user', async () => {
      mockFolderRepository.findById.mockResolvedValue(
        folderMock({ id: 'folder-parent', userId: 'user-uuid-999' }),
      );

      await expect(
        useCase.execute({ ...input, folderId: 'folder-parent' }),
      ).rejects.toThrow(
        new BadRequestException(
          ErrorMessagesEnum.FOLDER_DOES_NOT_BELONG_TO_USER,
        ),
      );

      expect(mockFolderRepository.create).not.toHaveBeenCalled();
    });
    it('the user already has an active folder with the same name', async () => {
      mockFolderRepository.findActiveByUserIdAndName.mockResolvedValue(
        folderMock(),
      );

      await expect(useCase.execute(input)).rejects.toThrow(
        new ConflictException(ErrorMessagesEnum.FOLDER_NAME_ALREADY_REGISTERED),
      );

      expect(mockFolderRepository.create).not.toHaveBeenCalled();
    });
  });
});
