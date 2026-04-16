import { BadRequestException } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { FolderRepository } from '../../repositories/FolderRepository';
import { ListFoldersUseCase } from './ListFoldersUseCase';

// ── Factories ─────────────────────────────────────────────────────────────────

function folderMock(overrides = {}) {
  return {
    id: 'folder-uuid-001',
    name: 'Documents',
    userId: 'user-uuid-001',
    folderId: null,
    parent: null,
    children: [],
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    deletedAt: null,
    ...overrides,
  };
}

// ── Mock repository ───────────────────────────────────────────────────────────

const listFoldersActive = jest.fn();
const countFoldersActive = jest.fn();

let useCase: ListFoldersUseCase;

const adminInput = { requesterUserId: 'admin-id', requesterRole: ROLE.ADMIN };
const userInput  = { requesterUserId: 'user-id',  requesterRole: ROLE.USER };

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ListFoldersUseCase', () => {
  beforeEach(() => {
    useCase = new ListFoldersUseCase({
      listFoldersActive,
      countFoldersActive,
    } as unknown as FolderRepository);
    jest.clearAllMocks();
  });

  describe('should be able to list folders with success', () => {
    it('returns mapped data and correct meta on page 1', async () => {
      const folders = [folderMock({ id: 'f-1' }), folderMock({ id: 'f-2' })];
      listFoldersActive.mockResolvedValueOnce(folders);
      countFoldersActive.mockResolvedValueOnce(2);

      const result = await useCase.execute(adminInput);

      expect(result.data).toHaveLength(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(2);
      expect(result.meta.hasNextPage).toBe(false);
    });

    it('maps repository result to correct output shape including parent and children', async () => {
      const parent = folderMock({ id: 'parent-id', name: 'Root', deletedAt: null });
      const child  = folderMock({ id: 'child-id',  name: 'Sub',  deletedAt: null });
      const folder = folderMock({ id: 'f-x', parent, children: [child] });
      listFoldersActive.mockResolvedValueOnce([folder]);
      countFoldersActive.mockResolvedValueOnce(1);

      const result = await useCase.execute(adminInput);

      expect(result.data[0].parent).toEqual({
        id: 'parent-id', name: 'Root',
        userId: parent.userId, folderId: parent.folderId,
      });
      expect(result.data[0].children).toHaveLength(1);
      expect(result.data[0].children[0].id).toBe('child-id');
    });

    it('excludes deleted parent from output', async () => {
      const deletedParent = folderMock({ id: 'p-del', deletedAt: new Date() });
      const folder = folderMock({ id: 'f-x', parent: deletedParent });
      listFoldersActive.mockResolvedValueOnce([folder]);
      countFoldersActive.mockResolvedValueOnce(1);

      const result = await useCase.execute(adminInput);

      expect(result.data[0].parent).toBeNull();
    });

    it('excludes deleted children from output', async () => {
      const activeChild  = folderMock({ id: 'c-active',  deletedAt: null });
      const deletedChild = folderMock({ id: 'c-deleted', deletedAt: new Date() });
      const folder = folderMock({ id: 'f-x', children: [activeChild, deletedChild] });
      listFoldersActive.mockResolvedValueOnce([folder]);
      countFoldersActive.mockResolvedValueOnce(1);

      const result = await useCase.execute(adminInput);

      expect(result.data[0].children).toHaveLength(1);
      expect(result.data[0].children[0].id).toBe('c-active');
    });

    it('calculates skip and hasNextPage correctly for page 2', async () => {
      listFoldersActive.mockResolvedValueOnce([folderMock(), folderMock()]);
      countFoldersActive.mockResolvedValueOnce(5);

      const result = await useCase.execute({ ...adminInput, page: 2, limit: 2 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.total).toBe(5);
      expect(result.meta.hasNextPage).toBe(true);
    });

    it('passes requester context, folderId, and rootsOnly to repository', async () => {
      listFoldersActive.mockResolvedValueOnce([]);
      countFoldersActive.mockResolvedValueOnce(0);

      await useCase.execute({ ...userInput, folderId: 'folder-abc', page: 1, limit: 10 });

      expect(listFoldersActive).toHaveBeenCalledWith('user-id', ROLE.USER, 'folder-abc', undefined, 0, 10);
      expect(countFoldersActive).toHaveBeenCalledWith('user-id', ROLE.USER, 'folder-abc', undefined);
    });
  });

  describe('validation', () => {
    it('throws BadRequestException when folderId and rootsOnly are both provided', async () => {
      await expect(
        useCase.execute({ ...adminInput, folderId: 'f-1', rootsOnly: true }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        useCase.execute({ ...adminInput, folderId: 'f-1', rootsOnly: true }),
      ).rejects.toThrow(ErrorMessagesEnum.INVALID_FOLDER_LIST_FILTER);
    });
  });
});
