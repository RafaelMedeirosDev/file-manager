import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { GetFolderByIdUseCase } from './GetFolderByIdUseCase';
import { FolderRepository } from '../../repositories/FolderRepository';
import { FileRepository } from '../../repositories/FileRepository';

const OWNER = 'user-uuid-001';
const OTHER = 'user-uuid-999';

// ── Factories ────────────────────────────────────────────
function folderMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'folder-uuid-001',
    name: 'Exames',
    userId: OWNER,
    folderId: null,
    isDefault: false,
    parent: null,
    children: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function relatedMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'folder-child',
    name: 'Filha',
    userId: OWNER,
    folderId: 'folder-uuid-001',
    deletedAt: null,
    ...overrides,
  };
}

const asOwner = {
  id: 'folder-uuid-001',
  requesterUserId: OWNER,
  requesterRole: ROLE.USER,
};
const asAdmin = {
  id: 'folder-uuid-001',
  requesterUserId: 'admin',
  requesterRole: ROLE.ADMIN,
};

// ── Mock repositories ────────────────────────────────────
const mockFolderRepository = { findById: jest.fn() };
const mockFileRepository = { listFilesActive: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('GetFolderByIdUseCase', () => {
  let useCase: GetFolderByIdUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetFolderByIdUseCase,
        { provide: FolderRepository, useValue: mockFolderRepository },
        { provide: FileRepository, useValue: mockFileRepository },
      ],
    }).compile();

    useCase = module.get<GetFolderByIdUseCase>(GetFolderByIdUseCase);
    jest.clearAllMocks();
    mockFileRepository.listFilesActive.mockResolvedValue([]);
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to get a folder with success', () => {
    it('returns an empty ancestor list for a root folder, without extra lookups', async () => {
      mockFolderRepository.findById.mockResolvedValueOnce(folderMock());

      const output = await useCase.execute(asOwner);

      expect(output.ancestors).toEqual([]);
      expect(mockFolderRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('walks up the hierarchy and returns ancestors root-first', async () => {
      mockFolderRepository.findById
        .mockResolvedValueOnce(folderMock({ folderId: 'folder-pai' }))
        .mockResolvedValueOnce(
          relatedMock({
            id: 'folder-pai',
            name: 'Pai',
            folderId: 'folder-avo',
          }),
        )
        .mockResolvedValueOnce(
          relatedMock({ id: 'folder-avo', name: 'Avo', folderId: null }),
        );

      const output = await useCase.execute(asOwner);

      // unshift: a raiz vem primeiro, e a propria pasta nao entra na lista
      expect(output.ancestors).toEqual([
        { id: 'folder-avo', name: 'Avo' },
        { id: 'folder-pai', name: 'Pai' },
      ]);
    });

    it('stops the walk at a soft-deleted ancestor, keeping the partial list', async () => {
      mockFolderRepository.findById
        .mockResolvedValueOnce(folderMock({ folderId: 'folder-pai' }))
        .mockResolvedValueOnce(
          relatedMock({
            id: 'folder-pai',
            name: 'Pai',
            folderId: 'folder-avo',
          }),
        )
        .mockResolvedValueOnce(
          relatedMock({
            id: 'folder-avo',
            folderId: null,
            deletedAt: new Date('2026-02-01T00:00:00.000Z'),
          }),
        );

      const output = await useCase.execute(asOwner);

      expect(output.ancestors).toEqual([{ id: 'folder-pai', name: 'Pai' }]);
    });

    it('maps the files returned by the repository', async () => {
      mockFolderRepository.findById.mockResolvedValueOnce(folderMock());
      mockFileRepository.listFilesActive.mockResolvedValue([
        {
          id: 'file-1',
          name: 'laudo',
          userId: OWNER,
          folderId: 'folder-uuid-001',
          extension: 'pdf',
          url: 'https://cdn.example.com/laudo.pdf',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

      const output = await useCase.execute(asOwner);

      expect(mockFileRepository.listFilesActive).toHaveBeenCalledWith(
        OWNER,
        ROLE.USER,
        'folder-uuid-001',
      );
      expect(output.files).toHaveLength(1);
      expect(output.files[0].extension).toBe('pdf');
    });
  });

  // ── Authorization ──────────────────────────────────────
  describe('authorization', () => {
    it('lets an ADMIN read a folder owned by someone else', async () => {
      mockFolderRepository.findById.mockResolvedValueOnce(
        folderMock({ userId: OTHER }),
      );

      await expect(useCase.execute(asAdmin)).resolves.toBeDefined();
    });

    it('hides a parent owned by someone else instead of throwing', async () => {
      mockFolderRepository.findById.mockResolvedValueOnce(
        folderMock({
          parent: relatedMock({ id: 'folder-pai', userId: OTHER }),
        }),
      );

      const output = await useCase.execute(asOwner);

      expect(output.parent).toBeNull();
    });

    it('filters out children owned by someone else instead of throwing', async () => {
      mockFolderRepository.findById.mockResolvedValueOnce(
        folderMock({
          children: [
            relatedMock({ id: 'folder-minha' }),
            relatedMock({ id: 'folder-alheia', userId: OTHER }),
          ],
        }),
      );

      const output = await useCase.execute(asOwner);

      expect(output.children.map((child) => child.id)).toEqual([
        'folder-minha',
      ]);
    });

    it('filters out soft-deleted children', async () => {
      mockFolderRepository.findById.mockResolvedValueOnce(
        folderMock({
          children: [
            relatedMock({ id: 'folder-ativa' }),
            relatedMock({
              id: 'folder-apagada',
              deletedAt: new Date('2026-02-01T00:00:00.000Z'),
            }),
          ],
        }),
      );

      const output = await useCase.execute(asOwner);

      expect(output.children.map((child) => child.id)).toEqual([
        'folder-ativa',
      ]);
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to get a folder if', () => {
    it('the folder does not exist', async () => {
      mockFolderRepository.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND),
      );
    });

    it('the folder is soft-deleted', async () => {
      mockFolderRepository.findById.mockResolvedValueOnce(
        folderMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND),
      );
    });

    it('a USER tries to read a folder owned by someone else', async () => {
      mockFolderRepository.findById.mockResolvedValueOnce(
        folderMock({ userId: OTHER }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new ForbiddenException(ErrorMessagesEnum.FOLDER_ACCESS_FORBIDDEN),
      );

      expect(mockFileRepository.listFilesActive).not.toHaveBeenCalled();
    });
  });
});
