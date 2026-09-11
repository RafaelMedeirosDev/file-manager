import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { CreateFileUseCase } from './CreateFileUseCase';
import { UserRepository } from '../../repositories/UserRepository';
import { FolderRepository } from '../../repositories/FolderRepository';
import { FileRepository } from '../../repositories/FileRepository';

const ORGANIZATION_ID = 'org-uuid-principal';

const OWNER = 'user-uuid-001';

// ── Factories ────────────────────────────────────────────
function userMock(overrides: Record<string, unknown> = {}) {
  return { id: OWNER, name: 'Alice', deletedAt: null, ...overrides };
}

function folderMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'folder-uuid-001',
    name: 'Exames',
    userId: OWNER,
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
    key: '11111111-1111-4111-8111-111111111111.pdf',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

const input = {
  organizationId: ORGANIZATION_ID,
  name: 'laudo',
  userId: OWNER,
  folderId: 'folder-uuid-001',
  extension: 'pdf',
  key: '11111111-1111-4111-8111-111111111111.pdf',
};

// ── Mock repositories ────────────────────────────────────
const mockUserRepository = { findById: jest.fn() };
const mockFolderRepository = { findById: jest.fn() };
const mockFileRepository = { create: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('CreateFileUseCase', () => {
  let useCase: CreateFileUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateFileUseCase,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: FolderRepository, useValue: mockFolderRepository },
        { provide: FileRepository, useValue: mockFileRepository },
      ],
    }).compile();

    useCase = module.get<CreateFileUseCase>(CreateFileUseCase);
    jest.clearAllMocks();
    mockUserRepository.findById.mockResolvedValue(userMock());
    mockFolderRepository.findById.mockResolvedValue(folderMock());
    mockFileRepository.create.mockResolvedValue(fileMock());
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to create a file with success', () => {
    it('persists the metadata and returns the mapped output', async () => {
      const output = await useCase.execute(input);

      expect(mockFileRepository.create).toHaveBeenCalledWith({
        organizationId: ORGANIZATION_ID,
        name: 'laudo',
        userId: OWNER,
        folderId: 'folder-uuid-001',
        extension: 'pdf',
        key: '11111111-1111-4111-8111-111111111111.pdf',
      });
      expect(output).toEqual({
        id: 'file-uuid-001',
        name: 'laudo',
        userId: OWNER,
        folderId: 'folder-uuid-001',
        extension: 'pdf',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to create a file if', () => {
    it('the owner does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );

      expect(mockFileRepository.create).not.toHaveBeenCalled();
    });

    it('the owner is soft-deleted', async () => {
      mockUserRepository.findById.mockResolvedValue(
        userMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND),
      );
    });

    it('the folder does not exist', async () => {
      mockFolderRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND),
      );
    });

    it('the folder is soft-deleted', async () => {
      mockFolderRepository.findById.mockResolvedValue(
        folderMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND),
      );
    });

    it('the folder belongs to another user', async () => {
      mockFolderRepository.findById.mockResolvedValue(
        folderMock({ userId: 'user-uuid-999' }),
      );

      await expect(useCase.execute(input)).rejects.toThrow(
        new BadRequestException(
          ErrorMessagesEnum.FOLDER_DOES_NOT_BELONG_TO_USER,
        ),
      );

      expect(mockFileRepository.create).not.toHaveBeenCalled();
    });
  });
});
