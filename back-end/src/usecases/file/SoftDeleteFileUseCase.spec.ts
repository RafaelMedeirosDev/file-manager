import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { SoftDeleteFileUseCase } from './SoftDeleteFileUseCase';
import { FileRepository } from '../../repositories/FileRepository';
import { FolderRepository } from '../../repositories/FolderRepository';

const NOW = new Date('2026-08-22T12:00:00.000Z');
const OWNER = 'user-uuid-001';
const OTHER = 'user-uuid-999';

// ── Factories ────────────────────────────────────────────
function fileMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'file-uuid-001',
    name: 'laudo',
    userId: OWNER,
    folderId: 'folder-default',
    url: 'https://cdn.example.com/laudo.pdf',
    deletedAt: null,
    ...overrides,
  };
}

function folderMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'folder-default',
    userId: OWNER,
    isDefault: true,
    deletedAt: null,
    ...overrides,
  };
}

const asOwner = {
  id: 'file-uuid-001',
  requesterUserId: OWNER,
  requesterRole: ROLE.USER,
};
const asAdmin = {
  id: 'file-uuid-001',
  requesterUserId: 'admin',
  requesterRole: ROLE.ADMIN,
};

// ── Mock repositories ────────────────────────────────────
const mockFileRepository = { findById: jest.fn(), softDeleteById: jest.fn() };
const mockFolderRepository = { findById: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('SoftDeleteFileUseCase', () => {
  let useCase: SoftDeleteFileUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoftDeleteFileUseCase,
        { provide: FileRepository, useValue: mockFileRepository },
        { provide: FolderRepository, useValue: mockFolderRepository },
      ],
    }).compile();

    useCase = module.get<SoftDeleteFileUseCase>(SoftDeleteFileUseCase);
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW.getTime());
    mockFileRepository.findById.mockResolvedValue(fileMock());
    mockFolderRepository.findById.mockResolvedValue(folderMock());
    mockFileRepository.softDeleteById.mockResolvedValue(fileMock());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to soft delete a file with success', () => {
    it('lets the owner delete a file inside their default folder', async () => {
      const output = await useCase.execute(asOwner);

      expect(mockFileRepository.softDeleteById).toHaveBeenCalledWith(
        'file-uuid-001',
        NOW,
      );
      expect(output).toEqual({
        id: 'file-uuid-001',
        name: 'laudo',
        userId: OWNER,
        folderId: 'folder-default',
        url: 'https://cdn.example.com/laudo.pdf',
        deletedAt: NOW.toISOString(),
      });
    });

    it('lets an ADMIN delete a file owned by someone else, without checking the folder', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ userId: OTHER, folderId: 'folder-qualquer' }),
      );

      await expect(useCase.execute(asAdmin)).resolves.toBeDefined();

      // ADMIN pula o bloco inteiro de propriedade e de isDefault
      expect(mockFolderRepository.findById).not.toHaveBeenCalled();
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to soft delete a file if', () => {
    it('the file does not exist', async () => {
      mockFileRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND),
      );

      expect(mockFileRepository.softDeleteById).not.toHaveBeenCalled();
    });

    it('the file is already soft-deleted', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND),
      );
    });

    it('a USER tries to delete a file owned by someone else', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ userId: OTHER }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new ForbiddenException(ErrorMessagesEnum.FILE_ACCESS_FORBIDDEN),
      );

      expect(mockFileRepository.softDeleteById).not.toHaveBeenCalled();
    });

    it('a USER owns the file but it is not in the default folder', async () => {
      mockFolderRepository.findById.mockResolvedValue(
        folderMock({ isDefault: false }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new ForbiddenException(ErrorMessagesEnum.FILE_ACCESS_FORBIDDEN),
      );
    });

    it('a USER owns the file but its folder no longer exists', async () => {
      mockFolderRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new ForbiddenException(ErrorMessagesEnum.FILE_ACCESS_FORBIDDEN),
      );
    });

    it('a USER owns the file but it sits outside any folder', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ folderId: null }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new ForbiddenException(ErrorMessagesEnum.FILE_ACCESS_FORBIDDEN),
      );

      // sem folderId o repositorio de pastas nem chega a ser consultado
      expect(mockFolderRepository.findById).not.toHaveBeenCalled();
    });
  });
});
