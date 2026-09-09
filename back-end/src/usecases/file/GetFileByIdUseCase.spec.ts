import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { GetFileByIdUseCase } from './GetFileByIdUseCase';
import { FileRepository } from '../../repositories/FileRepository';

const OWNER = 'user-uuid-001';
const OTHER = 'user-uuid-999';

// ── Factories ────────────────────────────────────────────
function folderRelationMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'folder-uuid-001',
    name: 'Exames',
    userId: OWNER,
    folderId: null,
    parent: null,
    children: [],
    deletedAt: null,
    ...overrides,
  };
}

function fileMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'file-uuid-001',
    name: 'laudo',
    userId: OWNER,
    folderId: 'folder-uuid-001',
    extension: 'pdf',
    folder: folderRelationMock(),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
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

// ── Mock repository ──────────────────────────────────────
const mockFileRepository = { findById: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('GetFileByIdUseCase', () => {
  let useCase: GetFileByIdUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetFileByIdUseCase,
        { provide: FileRepository, useValue: mockFileRepository },
      ],
    }).compile();

    useCase = module.get<GetFileByIdUseCase>(GetFileByIdUseCase);
    jest.clearAllMocks();
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to get a file with success', () => {
    it('returns the file with its folder', async () => {
      mockFileRepository.findById.mockResolvedValue(fileMock());

      const output = await useCase.execute(asOwner);

      expect(output.id).toBe('file-uuid-001');
      expect(output.folder).toEqual({
        id: 'folder-uuid-001',
        name: 'Exames',
        userId: OWNER,
        folderId: null,
        parent: null,
        children: [],
      });
    });
  });

  // ── Authorization ──────────────────────────────────────
  describe('authorization', () => {
    it('lets an ADMIN read a file owned by someone else', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ userId: OTHER }),
      );

      await expect(useCase.execute(asAdmin)).resolves.toBeDefined();
    });

    it('hides a folder owned by someone else instead of throwing', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ folder: folderRelationMock({ userId: OTHER }) }),
      );

      const output = await useCase.execute(asOwner);

      expect(output.folder).toBeNull();
    });

    it('hides a soft-deleted folder', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({
          folder: folderRelationMock({
            deletedAt: new Date('2026-02-01T00:00:00.000Z'),
          }),
        }),
      );

      const output = await useCase.execute(asOwner);

      expect(output.folder).toBeNull();
    });

    it('filters out children owned by someone else', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({
          folder: folderRelationMock({
            children: [
              folderRelationMock({ id: 'folder-minha' }),
              folderRelationMock({ id: 'folder-alheia', userId: OTHER }),
            ],
          }),
        }),
      );

      const output = await useCase.execute(asOwner);

      expect(output.folder?.children.map((child) => child.id)).toEqual([
        'folder-minha',
      ]);
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to get a file if', () => {
    it('the file does not exist', async () => {
      mockFileRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND),
      );
    });

    it('the file is soft-deleted', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND),
      );
    });

    it('a USER tries to read a file owned by someone else', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ userId: OTHER }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new ForbiddenException(ErrorMessagesEnum.FILE_ACCESS_FORBIDDEN),
      );
    });
  });
});
