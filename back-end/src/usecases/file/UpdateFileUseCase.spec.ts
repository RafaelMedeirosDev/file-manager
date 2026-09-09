import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { UpdateFileUseCase } from './UpdateFileUseCase';
import { FileRepository } from '../../repositories/FileRepository';
import { FolderRepository } from '../../repositories/FolderRepository';

const OWNER = 'user-uuid-001';

// ── Factories ────────────────────────────────────────────
function fileMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'file-uuid-001',
    name: 'laudo',
    userId: OWNER,
    folderId: 'folder-uuid-001',
    extension: 'pdf',
    key: '11111111-1111-4111-8111-111111111111.pdf',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function folderMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'folder-destino',
    userId: OWNER,
    deletedAt: null,
    ...overrides,
  };
}

// ── Mock repositories ────────────────────────────────────
const mockFileRepository = { findById: jest.fn(), updateById: jest.fn() };
const mockFolderRepository = { findById: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('UpdateFileUseCase', () => {
  let useCase: UpdateFileUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateFileUseCase,
        { provide: FileRepository, useValue: mockFileRepository },
        { provide: FolderRepository, useValue: mockFolderRepository },
      ],
    }).compile();

    useCase = module.get<UpdateFileUseCase>(UpdateFileUseCase);
    jest.clearAllMocks();
    mockFileRepository.findById.mockResolvedValue(fileMock());
    mockFolderRepository.findById.mockResolvedValue(folderMock());
    mockFileRepository.updateById.mockResolvedValue(
      fileMock({ folderId: 'folder-destino' }),
    );
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to update a file with success', () => {
    it('persists only the destination folder', async () => {
      await useCase.execute({
        id: 'file-uuid-001',
        folderId: 'folder-destino',
      });

      // A url do objeto deixou de ser atualizavel: o binario e resolvido pela
      // key gravada no upload, entao nao ha endereco a reescrever aqui.
      expect(mockFileRepository.updateById).toHaveBeenCalledWith(
        'file-uuid-001',
        { folderId: 'folder-destino' },
      );
    });

    it('validates the destination folder when moving the file', async () => {
      await useCase.execute({
        id: 'file-uuid-001',
        folderId: 'folder-destino',
      });

      expect(mockFolderRepository.findById).toHaveBeenCalledWith(
        'folder-destino',
      );
    });

    it('returns the file as returned by the update, not the one read before', async () => {
      const output = await useCase.execute({
        id: 'file-uuid-001',
        folderId: 'folder-destino',
      });

      expect(output.folderId).toBe('folder-destino');
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to update a file if', () => {
    it('no field was provided', async () => {
      await expect(useCase.execute({ id: 'file-uuid-001' })).rejects.toThrow(
        new BadRequestException(ErrorMessagesEnum.AT_LEAST_ONE_FIELD_REQUIRED),
      );

      // valida antes de ir ao repositorio
      expect(mockFileRepository.findById).not.toHaveBeenCalled();
    });

    it('the file does not exist', async () => {
      mockFileRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          id: 'missing',
          folderId: 'folder-destino',
        }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND),
      );
    });

    it('the file is soft-deleted', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(
        useCase.execute({
          id: 'file-uuid-001',
          folderId: 'folder-destino',
        }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND),
      );
    });

    it('the destination folder does not exist', async () => {
      mockFolderRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ id: 'file-uuid-001', folderId: 'missing' }),
      ).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND),
      );
    });

    it('the destination folder belongs to another user', async () => {
      mockFolderRepository.findById.mockResolvedValue(
        folderMock({ userId: 'user-uuid-999' }),
      );

      await expect(
        useCase.execute({ id: 'file-uuid-001', folderId: 'folder-destino' }),
      ).rejects.toThrow(
        new BadRequestException(
          ErrorMessagesEnum.FOLDER_DOES_NOT_BELONG_TO_USER,
        ),
      );

      expect(mockFileRepository.updateById).not.toHaveBeenCalled();
    });
  });
});
