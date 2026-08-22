import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  GatewayTimeoutException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'node:stream';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { DownloadFileUseCase } from './DownloadFileUseCase';
import { FileRepository } from '../../repositories/FileRepository';

const OWNER = 'user-uuid-001';
const OTHER = 'user-uuid-999';

// ── Factories ────────────────────────────────────────────
function fileMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'file-uuid-001',
    name: 'laudo',
    userId: OWNER,
    extension: 'pdf',
    url: 'https://cdn.example.com/laudo.pdf',
    deletedAt: null,
    ...overrides,
  };
}

/**
 * O use case faz `Readable.fromWeb(upstream.body)`, que valida em runtime que
 * o body e um web stream de verdade — por isso devolvemos um ReadableStream
 * real em vez de um objeto qualquer.
 */
function upstreamMock(headers: Record<string, string> = {}) {
  return {
    ok: true,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      },
    }),
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
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

// `fetch` e global, nao um modulo: nao ha o que passar para jest.mock.
const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

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
    fetchMock.mockResolvedValue(upstreamMock());
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to download a file with success', () => {
    it('streams the upstream body and builds the file name from name and extension', async () => {
      const output = await useCase.execute(asOwner);

      expect(output.stream).toBeInstanceOf(Readable);
      expect(output.fileName).toBe('laudo.pdf');
    });

    it('requests the stored url as a URL object', async () => {
      await useCase.execute(asOwner);

      const [requestedUrl, options] = fetchMock.mock.calls[0] as [
        URL,
        { signal: AbortSignal },
      ];
      expect(requestedUrl).toBeInstanceOf(URL);
      expect(requestedUrl.toString()).toBe('https://cdn.example.com/laudo.pdf');
      expect(options.signal).toBeDefined();
    });

    it('prefers the upstream content-type, stripping parameters', async () => {
      fetchMock.mockResolvedValue(
        upstreamMock({ 'content-type': 'text/csv; charset=utf-8' }),
      );
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ extension: 'csv' }),
      );

      const output = await useCase.execute(asOwner);

      expect(output.contentType).toBe('text/csv');
    });

    it('falls back to the extension map when upstream says octet-stream', async () => {
      fetchMock.mockResolvedValue(
        upstreamMock({ 'content-type': 'application/octet-stream' }),
      );

      const output = await useCase.execute(asOwner);

      expect(output.contentType).toBe('application/pdf');
    });

    it('falls back to octet-stream for an unknown extension without upstream header', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ extension: 'xyz' }),
      );

      const output = await useCase.execute(asOwner);

      expect(output.contentType).toBe('application/octet-stream');
    });

    it('forwards content-length when present and omits it otherwise', async () => {
      fetchMock.mockResolvedValue(upstreamMock({ 'content-length': '2048' }));
      expect((await useCase.execute(asOwner)).contentLength).toBe('2048');

      fetchMock.mockResolvedValue(upstreamMock());
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

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('the file is soft-deleted', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND),
      );
    });

    it('a USER tries to download a file owned by someone else', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ userId: OTHER }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new ForbiddenException(ErrorMessagesEnum.FILE_ACCESS_FORBIDDEN),
      );

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('the stored url is not parseable', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ url: 'nao-e-uma-url' }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new BadRequestException(ErrorMessagesEnum.INVALID_FILE_URL),
      );
    });

    it('the stored url uses a protocol other than http or https', async () => {
      mockFileRepository.findById.mockResolvedValue(
        fileMock({ url: 'file:///etc/passwd' }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new BadRequestException(ErrorMessagesEnum.INVALID_FILE_URL),
      );

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('the upstream request times out', async () => {
      fetchMock.mockRejectedValue(
        Object.assign(new Error('aborted'), { name: 'AbortError' }),
      );

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new GatewayTimeoutException(ErrorMessagesEnum.FILE_DOWNLOAD_TIMEOUT),
      );
    });

    it('the upstream request fails for any other reason', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new BadGatewayException(ErrorMessagesEnum.FILE_DOWNLOAD_UNAVAILABLE),
      );
    });

    it('the upstream responds with a non-ok status', async () => {
      fetchMock.mockResolvedValue({ ...upstreamMock(), ok: false });

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new BadGatewayException(ErrorMessagesEnum.FILE_DOWNLOAD_UNAVAILABLE),
      );
    });

    it('the upstream responds without a body', async () => {
      fetchMock.mockResolvedValue({ ...upstreamMock(), body: null });

      await expect(useCase.execute(asOwner)).rejects.toThrow(
        new BadGatewayException(ErrorMessagesEnum.FILE_DOWNLOAD_UNAVAILABLE),
      );
    });
  });
});
