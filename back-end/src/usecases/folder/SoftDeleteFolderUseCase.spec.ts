import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { SoftDeleteFolderUseCase } from './SoftDeleteFolderUseCase';
import { FolderRepository } from '../../repositories/FolderRepository';

// ── Factories ────────────────────────────────────────────
// `children` faz parte do payload que o repositorio devolve (findById usa
// include) e a travessia da subarvore o le. Sem o campo, todo teste estouraria
// em `undefined`.
function folderMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'folder-uuid-001',
    name: 'Exames',
    userId: 'user-uuid-001',
    folderId: null,
    isDefault: false,
    deletedAt: null,
    children: [],
    ...overrides,
  };
}

// ── Mock repository ──────────────────────────────────────
const mockFolderRepository = {
  findById: jest.fn(),
  softDeleteSubtree: jest.fn(),
};

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
    mockFolderRepository.findById.mockResolvedValue(folderMock());
    mockFolderRepository.softDeleteSubtree.mockResolvedValue([
      { count: 1 },
      { count: 0 },
    ]);
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to soft delete a folder with success', () => {
    it('marks the folder and echoes the deletion timestamp', async () => {
      const output = await useCase.execute({ id: 'folder-uuid-001' });

      expect(mockFolderRepository.softDeleteSubtree).toHaveBeenCalledWith(
        ['folder-uuid-001'],
        expect.any(Date),
      );
      // O ISO devolvido tem de ser o mesmo instante gravado no banco.
      const [, deletedAt] = mockFolderRepository.softDeleteSubtree.mock
        .calls[0] as [string[], Date];
      expect(output).toEqual({
        id: 'folder-uuid-001',
        name: 'Exames',
        userId: 'user-uuid-001',
        folderId: null,
        deletedAt: deletedAt.toISOString(),
        deletedFoldersCount: 1,
      });
    });

    it('cascades to the whole subtree, not just the folder asked for', async () => {
      // pai -> filho -> neto
      mockFolderRepository.findById.mockImplementation((id: string) => {
        if (id === 'folder-uuid-001') {
          return Promise.resolve(
            folderMock({ children: [{ id: 'child', deletedAt: null }] }),
          );
        }
        if (id === 'child') {
          return Promise.resolve(
            folderMock({
              id: 'child',
              children: [{ id: 'grandchild', deletedAt: null }],
            }),
          );
        }
        return Promise.resolve(folderMock({ id, children: [] }));
      });

      const output = await useCase.execute({ id: 'folder-uuid-001' });

      expect(mockFolderRepository.softDeleteSubtree).toHaveBeenCalledWith(
        ['folder-uuid-001', 'child', 'grandchild'],
        expect.any(Date),
      );
      expect(output.deletedFoldersCount).toBe(3);
    });

    it('skips children that were already deleted', async () => {
      mockFolderRepository.findById.mockResolvedValue(
        folderMock({
          children: [
            { id: 'active-child', deletedAt: null },
            { id: 'gone-child', deletedAt: new Date('2026-01-01') },
          ],
        }),
      );

      await useCase.execute({ id: 'folder-uuid-001' });

      const [ids] = mockFolderRepository.softDeleteSubtree.mock
        .calls[0] as string[][];
      expect(ids).toContain('active-child');
      expect(ids).not.toContain('gone-child');
    });

    it('terminates on a cyclic hierarchy instead of looping forever', async () => {
      // A -> B -> A. Sem o Set de visitados a travessia nao teria fim.
      mockFolderRepository.findById.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'folder-uuid-001'
            ? folderMock({ children: [{ id: 'b', deletedAt: null }] })
            : folderMock({
                id: 'b',
                children: [{ id: 'folder-uuid-001', deletedAt: null }],
              }),
        ),
      );

      const output = await useCase.execute({ id: 'folder-uuid-001' });

      expect(output.deletedFoldersCount).toBe(2);
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to soft delete a folder if', () => {
    it('it is the default folder of the user', async () => {
      // Antes a exclusao era permitida, e o usuario perdia de uma vez o upload
      // e a exclusao dos proprios arquivos, sem rota que devolvesse isso.
      mockFolderRepository.findById.mockResolvedValue(
        folderMock({ isDefault: true }),
      );

      await expect(useCase.execute({ id: 'folder-uuid-001' })).rejects.toThrow(
        new BadRequestException(ErrorMessagesEnum.CANNOT_DELETE_DEFAULT_FOLDER),
      );

      expect(mockFolderRepository.softDeleteSubtree).not.toHaveBeenCalled();
    });

    it('the folder does not exist', async () => {
      mockFolderRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute({ id: 'missing' })).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND),
      );

      expect(mockFolderRepository.softDeleteSubtree).not.toHaveBeenCalled();
    });

    it('the folder was already soft-deleted', async () => {
      mockFolderRepository.findById.mockResolvedValue(
        folderMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(useCase.execute({ id: 'folder-uuid-001' })).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND),
      );
    });
  });
});
