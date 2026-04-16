import { ROLE } from '@prisma/client';
import { FileRepository } from '../../repositories/FileRepository';
import { ListFilesUseCase } from './ListFilesUseCase';

// ── Factories ─────────────────────────────────────────────────────────────────

function fileMock(overrides = {}) {
  return {
    id: 'file-uuid-001',
    name: 'report.pdf',
    userId: 'user-uuid-001',
    folderId: 'folder-uuid-001',
    extension: 'pdf',
    url: 'https://storage.example.com/report.pdf',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    deletedAt: null,
    ...overrides,
  };
}

// ── Mock repository ───────────────────────────────────────────────────────────

const listFilesActive = jest.fn();
const countFilesActive = jest.fn();

let useCase: ListFilesUseCase;

const adminInput = { requesterUserId: 'admin-id', requesterRole: ROLE.ADMIN };
const userInput  = { requesterUserId: 'user-id',  requesterRole: ROLE.USER };

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ListFilesUseCase', () => {
  beforeEach(() => {
    useCase = new ListFilesUseCase({
      listFilesActive,
      countFilesActive,
    } as unknown as FileRepository);
    jest.clearAllMocks();
  });

  describe('should be able to list files with success', () => {
    it('returns mapped data and correct meta on page 1', async () => {
      const files = [fileMock({ id: 'f-1' }), fileMock({ id: 'f-2' })];
      listFilesActive.mockResolvedValueOnce(files);
      countFilesActive.mockResolvedValueOnce(2);

      const result = await useCase.execute(adminInput);

      expect(result.data).toHaveLength(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(2);
      expect(result.meta.hasNextPage).toBe(false);
    });

    it('maps repository result to correct output shape', async () => {
      const file = fileMock({ id: 'f-x', name: 'photo.png', extension: 'png', url: 'https://s3.example.com/photo.png' });
      listFilesActive.mockResolvedValueOnce([file]);
      countFilesActive.mockResolvedValueOnce(1);

      const result = await useCase.execute(adminInput);

      expect(result.data[0]).toEqual({
        id: 'f-x',
        name: 'photo.png',
        userId: file.userId,
        folderId: file.folderId,
        extension: 'png',
        url: 'https://s3.example.com/photo.png',
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      });
    });

    it('calculates skip and hasNextPage correctly for page 2', async () => {
      listFilesActive.mockResolvedValueOnce([fileMock(), fileMock()]);
      countFilesActive.mockResolvedValueOnce(5);

      const result = await useCase.execute({ ...adminInput, page: 2, limit: 2 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.total).toBe(5);
      expect(result.meta.hasNextPage).toBe(true);
    });

    it('passes requester context and folderId to repository', async () => {
      listFilesActive.mockResolvedValueOnce([]);
      countFilesActive.mockResolvedValueOnce(0);

      await useCase.execute({ ...userInput, folderId: 'folder-abc' });

      expect(listFilesActive).toHaveBeenCalledWith('user-id', ROLE.USER, 'folder-abc', 0, 10);
      expect(countFilesActive).toHaveBeenCalledWith('user-id', ROLE.USER, 'folder-abc');
    });

    it('passes undefined folderId when not provided', async () => {
      listFilesActive.mockResolvedValueOnce([]);
      countFilesActive.mockResolvedValueOnce(0);

      await useCase.execute(adminInput);

      expect(listFilesActive).toHaveBeenCalledWith('admin-id', ROLE.ADMIN, undefined, 0, 10);
      expect(countFilesActive).toHaveBeenCalledWith('admin-id', ROLE.ADMIN, undefined);
    });

    it('returns empty data when repository returns no results', async () => {
      listFilesActive.mockResolvedValueOnce([]);
      countFilesActive.mockResolvedValueOnce(0);

      const result = await useCase.execute(adminInput);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
    });
  });
});
