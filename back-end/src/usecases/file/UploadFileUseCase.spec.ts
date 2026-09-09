import {
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { UploadFileUseCase } from './UploadFileUseCase';
import { FileRepository } from '../../repositories/FileRepository';
import { FolderRepository } from '../../repositories/FolderRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { env } from '../../config/env';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
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

function inputMock(overrides: Record<string, unknown> = {}) {
  return {
    buffer: Buffer.from('conteudo'),
    name: 'laudo',
    requesterId: 'user-uuid-001',
    requesterRole: ROLE.USER,
    folderId: 'folder-uuid-001',
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
describe('UploadFileUseCase', () => {
  let useCase: UploadFileUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadFileUseCase,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: FolderRepository, useValue: mockFolderRepository },
        { provide: FileRepository, useValue: mockFileRepository },
      ],
    }).compile();

    useCase = module.get<UploadFileUseCase>(UploadFileUseCase);
    jest.clearAllMocks();

    mockFolderRepository.findById.mockResolvedValue(folderMock());
    mockUserRepository.findById.mockResolvedValue(userMock());
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to upload a file with success', () => {
    it('stores the canonical content type, not the one declared by the client', async () => {
      mockFileRepository.create.mockResolvedValue({
        id: 'file-uuid-001',
        name: 'laudo',
        userId: 'user-uuid-001',
        folderId: 'folder-uuid-001',
        extension: 'png',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await useCase.execute(
        inputMock({ extension: 'png', mimeType: 'application/octet-stream' }),
      );

      expect(sendMock).toHaveBeenCalledTimes(1);
      const command = sendMock.mock.calls[0][0] as {
        input: Record<string, unknown>;
      };
      expect(command.input.ContentType).toBe('image/png');
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to upload a file if', () => {
    it('the extension is not in the whitelist', async () => {
      await expect(
        useCase.execute(
          inputMock({ extension: 'svg', mimeType: 'image/svg+xml' }),
        ),
      ).rejects.toThrow(
        new UnsupportedMediaTypeException(
          ErrorMessagesEnum.FILE_TYPE_NOT_ALLOWED,
        ),
      );

      expect(sendMock).not.toHaveBeenCalled();
      expect(mockFileRepository.create).not.toHaveBeenCalled();
    });

    it('the declared mimetype contradicts the extension', async () => {
      await expect(
        useCase.execute(inputMock({ extension: 'png', mimeType: 'text/html' })),
      ).rejects.toThrow(
        new UnsupportedMediaTypeException(
          ErrorMessagesEnum.FILE_TYPE_NOT_ALLOWED,
        ),
      );

      expect(sendMock).not.toHaveBeenCalled();
    });

    it('the buffer is above the configured size limit', async () => {
      const oversized = Buffer.alloc(env.MAX_UPLOAD_SIZE_BYTES + 1);

      await expect(
        useCase.execute(inputMock({ buffer: oversized })),
      ).rejects.toThrow(
        new PayloadTooLargeException(ErrorMessagesEnum.FILE_TOO_LARGE),
      );

      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  // ── Compensacao no R2 ──────────────────────────────────
  describe('should not leave an orphan object in the bucket if', () => {
    it('the database insert fails after the upload succeeded', async () => {
      mockFileRepository.create.mockRejectedValue(new Error('insert failed'));

      await expect(useCase.execute(inputMock())).rejects.toThrow(
        'insert failed',
      );

      // Duas chamadas ao R2: o upload e a limpeza.
      expect(sendMock).toHaveBeenCalledTimes(2);

      const put = sendMock.mock.calls[0][0] as PutObjectCommand;
      const remove = sendMock.mock.calls[1][0] as DeleteObjectCommand;

      expect(put).toBeInstanceOf(PutObjectCommand);
      expect(remove).toBeInstanceOf(DeleteObjectCommand);
      // A limpeza tem de apagar exatamente o objeto que acabou de subir.
      expect(remove.input.Key).toBe(put.input.Key);
    });

    it('reports the original error even when the cleanup itself fails', async () => {
      mockFileRepository.create.mockRejectedValue(new Error('insert failed'));
      sendMock
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('R2 unreachable'));

      // O erro que importa e o do banco: mascara-lo com um problema de storage
      // esconderia a causa.
      await expect(useCase.execute(inputMock())).rejects.toThrow(
        'insert failed',
      );
    });
  });
});
