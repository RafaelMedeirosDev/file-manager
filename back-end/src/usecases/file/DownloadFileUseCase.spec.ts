import {
  BadGatewayException,
  ForbiddenException,
  GatewayTimeoutException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'node:stream';
import { NoSuchKey } from '@aws-sdk/client-s3';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { DownloadFileUseCase } from './DownloadFileUseCase';
import { FileRepository } from '../../repositories/FileRepository';
import { r2Client } from '../../shared/lib/r2Client';

const OWNER = 'user-uuid-001';
const OTHER = 'user-uuid-999';
const KEY = '11111111-1111-4111-8111-111111111111.pdf';

jest.mock('../../shared/lib/r2Client', () => ({
  r2Client: { send: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/unbound-method
const sendMock = jest.mocked(r2Client).send as unknown as jest.Mock;

// ── Factories ────────────────────────────────────────────
function fileMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'file-uuid-001',
    name: 'laudo',
    userId: OWNER,
    extension: 'pdf',
    key: KEY,
    deletedAt: null,
    ...overrides,
  };
}

/**
 * O use case devolve `object.Body` direto como Readable — o SDK entrega um
 * stream do Node no runtime, entao o mock precisa ser um Readable de verdade.
 */
function objectMock(overrides: Record<string, unknown> = {}) {
  return {
    Body: Readable.from([Buffer.from([1, 2, 3])]),
    ContentType: undefined,
    ContentLength: undefined,
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
describe('DownloadFileUseCase', () => {
  let useCase: DownloadFileUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadFileUseCase,
        { provide: FileRepository, useValue: mockFileRepository },
      ],
    }).compile();

    useCase = module.get<DownloadFileUseCase>(DownloadFileUseCase);
    jest.clearAllMocks();
    mockFileRepository.findById.mockResolvedValue(fileMock());
    sendMock.mockResolvedValue(objectMock());
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to download a file with success', () => {
    it('streams the object body and builds the file name from name and extension', async () => {
      const output = await useCase.execute(asOwner);

      expect(output.stream).toBeInstanceOf(Readable);
      expect(output.fileName).toBe('laudo.pdf');
    });

    it('reads the object by its stored key, never by a url', async () => {
      await useCase.execute(asOwner);

      expect(sendMock).toHaveBeenCalledTimes(1);
      const command = sendMock.mock.calls[0][0] as {
        input: Record<string, unknown>;
      };
      expect(command.input.Key).toBe(KEY);
      // A garantia central desta mudanca: nenhum endereco vindo do banco
      // participa da leitura, entao nao ha destino que um ADMIN possa forjar.
      expect(JSON.stringify(command.input)).not.toContain('http');
    });

    it('aborts the read after the configured timeout', async () => {
      await useCase.execute(asOwner);

      const options = sendMock.mock.calls[0][1] as { abortSignal: AbortSignal };
      expect(options.abortSignal).toBeDefined();
    });

    it('prefers the stored content-type, stripping parameters', async () => {
      sendMock.mockResolvedValue(
        objectMock({ ContentType: 'text/csv; charset=utf-8' }),
      );
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ extension: 'csv' }),
      );

      const output = await useCase.execute(asOwner);

      expect(output.contentType).toBe('text/csv');
    });

    it('falls back to the extension map when the object says octet-stream', async () => {
      sendMock.mockResolvedValue(
        objectMock({ ContentType: 'application/octet-stream' }),
      );

      const output = await useCase.execute(asOwner);

      expect(output.contentType).toBe('application/pdf');
    });

    it('falls back to octet-stream for an unknown extension without a stored type', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ extension: 'xyz' }),
      );

      const output = await useCase.execute(asOwner);

      expect(output.contentType).toBe('application/octet-stream');
    });

    it('forwards content-length when present and omits it otherwise', async () => {
      sendMock.mockResolvedValue(objectMock({ ContentLength: 2048 }));
      expect((await useCase.execute(asOwner)).contentLength).toBe('2048');

      sendMock.mockResolvedValue(objectMock());
      expect((await useCase.execute(asOwner)).contentLength).toBeUndefined();
    });

    it('lets an ADMIN download a file owned by someone else', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ userId: OTHER }),
      );

      await expect(useCase.execute(asAdmin)).resolves.toBeDefined();
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to download a file if', () => {
    it('the file does not exist', async () => {
      mockFileRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND),
      );

      expect(sendMock).not.toHaveBeenCalled();
    });

    it('the file is soft-deleted', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND),
      );

      expect(sendMock).not.toHaveBeenCalled();
    });

    it('a USER tries to download a file owned by someone else', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ userId: OTHER }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new ForbiddenException(ErrorMessagesEnum.FILE_ACCESS_FORBIDDEN),
      );

      expect(sendMock).not.toHaveBeenCalled();
    });

    it('the object is missing from the bucket', async () => {
      sendMock.mockRejectedValue(
        new NoSuchKey({ message: 'missing', $metadata: {} }),
      );

      // O registro existe mas o binario nao: 404 descreve melhor do que 502.
      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND),
      );
    });

    it('the read times out', async () => {
      sendMock.mockRejectedValue(
        Object.assign(new Error('aborted'), { name: 'TimeoutError' }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new GatewayTimeoutException(ErrorMessagesEnum.FILE_DOWNLOAD_TIMEOUT),
      );
    });

    it('the read fails for any other reason', async () => {
      sendMock.mockRejectedValue(new Error('AccessDenied'));

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new BadGatewayException(ErrorMessagesEnum.FILE_DOWNLOAD_UNAVAILABLE),
      );
    });

    it('the object comes back without a body', async () => {
      sendMock.mockResolvedValue(objectMock({ Body: undefined }));

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new BadGatewayException(ErrorMessagesEnum.FILE_DOWNLOAD_UNAVAILABLE),
      );
    });
  });
});
