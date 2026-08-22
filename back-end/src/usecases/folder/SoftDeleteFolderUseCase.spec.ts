import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { SoftDeleteFolderUseCase } from './SoftDeleteFolderUseCase';
import { FolderRepository } from '../../repositories/FolderRepository';

const NOW = new Date('2026-08-22T12:00:00.000Z');

// ── Factories ────────────────────────────────────────────
function folderMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'folder-uuid-001',
    name: 'Exames',
    userId: 'user-uuid-001',
    folderId: null,
    isDefault: false,
    deletedAt: null,
    ...overrides,
  };
}

// ── Mock repository ──────────────────────────────────────
const mockFolderRepository = { findById: jest.fn(), softDeleteById: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('SoftDeleteFolderUseCase', () => {
  let useCase: SoftDeleteFolderUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoftDeleteFolderUseCase,
        { provide: FolderRepository, useValue: mockFolderRepository },
      ],
    }).compile();

    useCase = module.get<SoftDeleteFolderUseCase>(SoftDeleteFolderUseCase);
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW.getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to soft delete a folder with success', () => {
    it('passes the generated date to the repository and returns it as ISO', async () => {
      mockFolderRepository.findById.mockResolvedValue(folderMock());
      mockFolderRepository.softDeleteById.mockResolvedValue(folderMock());

      const output = await useCase.execute({ id: 'folder-uuid-001' });

      expect(mockFolderRepository.softDeleteById).toHaveBeenCalledWith(
        'folder-uuid-001',
        NOW,
      );
      expect(output).toEqual({
        id: 'folder-uuid-001',
        name: 'Exames',
        userId: 'user-uuid-001',
        folderId: null,
        deletedAt: NOW.toISOString(),
      });
    });

    it('also deletes a default folder: isDefault is not checked here', async () => {
      mockFolderRepository.findById.mockResolvedValue(
        folderMock({ isDefault: true }),
      );
      mockFolderRepository.softDeleteById.mockResolvedValue(
        folderMock({ isDefault: true }),
      );

      await expect(
        useCase.execute({ id: 'folder-uuid-001' }),
      ).resolves.toBeDefined();
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to soft delete a folder if', () => {
    it('the folder does not exist', async () => {
      mockFolderRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute({ id: 'missing' })).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND),
      );

      expect(mockFolderRepository.softDeleteById).not.toHaveBeenCalled();
    });

    it('the folder is already soft-deleted', async () => {
      mockFolderRepository.findById.mockResolvedValue(
        folderMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(useCase.execute({ id: 'folder-uuid-001' })).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND),
      );

      expect(mockFolderRepository.softDeleteById).not.toHaveBeenCalled();
    });
  });
});
