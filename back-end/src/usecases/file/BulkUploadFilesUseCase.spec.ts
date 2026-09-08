import { Test, TestingModule } from '@nestjs/testing';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { BulkUploadFilesUseCase } from './BulkUploadFilesUseCase';
import { FileRepository } from '../../repositories/FileRepository';
import { FolderRepository } from '../../repositories/FolderRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { env } from '../../config/env';
import { r2Client } from '../../shared/lib/r2Client';

jest.mock('../../shared/lib/r2Client', () => ({
  r2Client: { send: jest.fn() },
}));

// r2Client.send aqui e um jest.fn() do mock acima, nao um metodo real do
// S3Client — a regra unbound-method nao se aplica.
// eslint-disable-next-line @typescript-eslint/unbound-method
const sendMock = jest.mocked(r2Client).send as unknown as jest.Mock;

// ── Factories ────────────────────────────────────────────
function folderMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'folder-uuid-001',
    name: 'Alice',
    userId: 'user-uuid-001',
    folderId: null,
    isDefault: true,
    deletedAt: null,
    ...overrides,
  };
}

function userMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-001',
    name: 'Alice',
    email: 'alice@example.com',
    role: ROLE.USER,
    deletedAt: null,
    ...overrides,
  };
}

function entryMock(overrides: Record<string, unknown> = {}) {
  return {
    buffer: Buffer.from('conteudo'),
    name: 'laudo',
    extension: 'pdf',
    mimeType: 'application/pdf',
    ...overrides,
  };
}

// ── Mock repositories ────────────────────────────────────
const mockUserRepository = { findById: jest.fn() };
const mockFolderRepository = { findById: jest.fn() };
const mockFileRepository = { create: jest.fn() };

// ── Suite ────────────────────────────────────────────────
describe('BulkUploadFilesUseCase', () => {
  let useCase: BulkUploadFilesUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkUploadFilesUseCase,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: FolderRepository, useValue: mockFolderRepository },
        { provide: FileRepository, useValue: mockFileRepository },
      ],
    }).compile();

    useCase = module.get<BulkUploadFilesUseCase>(BulkUploadFilesUseCase);
    jest.clearAllMocks();

    mockFolderRepository.findById.mockResolvedValue(folderMock());
    mockUserRepository.findById.mockResolvedValue(userMock());
    mockFileRepository.create.mockImplementation((data: { name: string }) =>
      Promise.resolve({
        id: `file-${data.name}`,
        name: data.name,
        url: `https://cdn.example.com/${data.name}.pdf`,
      }),
    );
  });

  // ── Partial failure ────────────────────────────────────
  describe('should tolerate partial failure without aborting the batch', () => {
    it('reports the rejected type and still persists the valid file', async () => {
      const output = await useCase.execute({
        files: [
          entryMock({ name: 'valido' }),
          entryMock({
            name: 'malicioso',
            extension: 'svg',
            mimeType: 'image/svg+xml',
          }),
        ],
        folderId: 'folder-uuid-001',
        requesterId: 'user-uuid-001',
        requesterRole: ROLE.USER,
      });

      expect(output.results).toHaveLength(2);
      expect(output.results[0]).toEqual(
        expect.objectContaining({ name: 'valido', id: 'file-valido' }),
      );
      expect(output.results[1]).toEqual({
        name: 'malicioso',
        extension: 'svg',
        error: ErrorMessagesEnum.FILE_TYPE_NOT_ALLOWED,
      });

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(mockFileRepository.create).toHaveBeenCalledTimes(1);
    });

    it('reports an oversized file without dropping the rest of the batch', async () => {
      const output = await useCase.execute({
        files: [
          entryMock({
            name: 'grande',
            buffer: Buffer.alloc(env.MAX_UPLOAD_SIZE_BYTES + 1),
          }),
          entryMock({ name: 'valido' }),
        ],
        folderId: 'folder-uuid-001',
        requesterId: 'user-uuid-001',
        requesterRole: ROLE.USER,
      });

      expect(output.results[0]).toEqual({
        name: 'grande',
        extension: 'pdf',
        error: ErrorMessagesEnum.FILE_TOO_LARGE,
      });
      expect(output.results[1]).toEqual(
        expect.objectContaining({ name: 'valido', id: 'file-valido' }),
      );
      expect(mockFileRepository.create).toHaveBeenCalledTimes(1);
    });

    it('does not leak internal error details when the upload throws', async () => {
      sendMock.mockRejectedValueOnce(
        new Error('S3 credentials invalid for bucket acme-prod'),
      );

      const output = await useCase.execute({
        files: [entryMock({ name: 'falha' })],
        folderId: 'folder-uuid-001',
        requesterId: 'user-uuid-001',
        requesterRole: ROLE.USER,
      });

      expect(output.results[0]).toEqual({
        name: 'falha',
        extension: 'pdf',
        error: ErrorMessagesEnum.UPLOAD_FAILED,
      });
    });
  });
});
