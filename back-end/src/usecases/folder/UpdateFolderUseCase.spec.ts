import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { UpdateFolderUseCase } from './UpdateFolderUseCase';
import { FolderRepository } from '../../repositories/FolderRepository';

const ORGANIZATION_ID = 'org-uuid-principal';

// ── Factories ────────────────────────────────────────────
function folderMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'folder-uuid-001',
    name: 'Exames',
    userId: 'user-uuid-001',
    folderId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

const input = {
  organizationId: ORGANIZATION_ID,
  id: 'folder-uuid-001',
  name: 'Laudos',
};

// ── Mock repository ──────────────────────────────────────
const mockFolderRepository = {
  findById: jest.fn(),
  findActiveByUserIdAndName: jest.fn(),
  updateById: jest.fn(),
};

// ── Suite ────────────────────────────────────────────────
describe('UpdateFolderUseCase', () => {
  let useCase: UpdateFolderUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateFolderUseCase,
        { provide: FolderRepository, useValue: mockFolderRepository },
      ],
    }).compile();

    useCase = module.get<UpdateFolderUseCase>(UpdateFolderUseCase);
    jest.clearAllMocks();
    mockFolderRepository.findById.mockResolvedValue(folderMock());
    mockFolderRepository.findActiveByUserIdAndName.mockResolvedValue(null);
    mockFolderRepository.updateById.mockResolvedValue(
      folderMock({ name: 'Laudos' }),
    );
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to update a folder with success', () => {
    it('checks name uniqueness against the owner, excluding the folder itself', async () => {
      await useCase.execute(input);

      // excludeId permite renomear a pasta para o proprio nome
      expect(
        mockFolderRepository.findActiveByUserIdAndName,
      ).toHaveBeenCalledWith({
        organizationId: ORGANIZATION_ID,
        userId: 'user-uuid-001',
        name: 'Laudos',
        excludeId: 'folder-uuid-001',
      });
    });

    it('returns the folder as returned by the update, not the one read before', async () => {
      const output = await useCase.execute(input);

      expect(mockFolderRepository.updateById).toHaveBeenCalledWith(
        'folder-uuid-001',
        { name: 'Laudos' },
      );
      expect(output.name).toBe('Laudos');
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to update a folder if', () => {
    it('the folder does not exist', async () => {
      mockFolderRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND),
      );

      expect(mockFolderRepository.updateById).not.toHaveBeenCalled();
    });

    it('the folder is soft-deleted', async () => {
      mockFolderRepository.findById.mockResolvedValue(
        folderMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND),
      );
    });

    it('another active folder of the same owner already uses the name', async () => {
      mockFolderRepository.findActiveByUserIdAndName.mockResolvedValue(
        folderMock({ id: 'folder-outra' }),
      );

      await expect(useCase.execute(input)).rejects.toThrow(
        new ConflictException(ErrorMessagesEnum.FOLDER_NAME_ALREADY_REGISTERED),
      );

      expect(mockFolderRepository.updateById).not.toHaveBeenCalled();
    });
  });

  // ── Comportamento atual, documentado ───────────────────
  describe('authorization', () => {
    it('renames any folder by id: ownership is enforced by the ADMIN-only route, not here', async () => {
      // O use case nao recebe requester. Este teste fixa o contrato atual: se
      // um dia a checagem de propriedade descer para ca, ele quebra de proposito.
      await expect(useCase.execute(input)).resolves.toBeDefined();
    });
  });
});
