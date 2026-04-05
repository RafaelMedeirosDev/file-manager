import { BadGatewayException,
  BadRequestException,
  ForbiddenException,
  GatewayTimeoutException,
  Injectable,
  NotFoundException, Logger } from '@nestjs/common';
import { Readable } from 'node:stream';
import { ROLE } from '@prisma/client';
import { FileRepository } from '../../repositories/FileRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

export type DownloadFileInput = {
  id: string;
  requesterUserId: string;
  requesterRole: ROLE;
};

export type DownloadFileOutput = {
  stream: Readable;
  fileName: string;
  contentType: string;
  contentLength?: string;
};

@Injectable()
export class DownloadFileUseCase {
  private readonly logger = new Logger(DownloadFileUseCase.name);
  private static readonly DOWNLOAD_TIMEOUT_MS = 15_000;
  private static readonly MIME_BY_EXTENSION: Record<string, string> = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    pdf: 'application/pdf',
    csv: 'text/csv',
    txt: 'text/plain',
    json: 'application/json',
    zip: 'application/zip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  };

  constructor(private readonly fileRepository: FileRepository) {}

  async execute(input: DownloadFileInput): Promise<DownloadFileOutput> {
    this.logger.log('[DownloadFileUseCase] Execute started');
    const file = await this.fileRepository.findById(input.id);

    if (!file || file.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND);
    }

    if (input.requesterRole !== ROLE.ADMIN && file.userId !== input.requesterUserId) {
      throw new ForbiddenException(ErrorMessagesEnum.FILE_ACCESS_FORBIDDEN);
    }

    let fileUrl: URL;

    try {
      fileUrl = new URL(file.url);
    } catch {
      throw new BadRequestException(ErrorMessagesEnum.INVALID_FILE_URL);
    }

    if (!['http:', 'https:'].includes(fileUrl.protocol)) {
      throw new BadRequestException(ErrorMessagesEnum.INVALID_FILE_URL);
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      DownloadFileUseCase.DOWNLOAD_TIMEOUT_MS,
    );
    let upstream: globalThis.Response;

    try {
      upstream = await fetch(fileUrl, { signal: abortController.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GatewayTimeoutException(ErrorMessagesEnum.FILE_DOWNLOAD_TIMEOUT);
      }

      throw new BadGatewayException(ErrorMessagesEnum.FILE_DOWNLOAD_UNAVAILABLE);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!upstream.ok || !upstream.body) {
      throw new BadGatewayException(ErrorMessagesEnum.FILE_DOWNLOAD_UNAVAILABLE);
    }

    const upstreamContentType = upstream.headers
      .get('content-type')
      ?.split(';')[0]
      .trim()
      .toLowerCase();
    const fallbackContentType =
      DownloadFileUseCase.MIME_BY_EXTENSION[file.extension.toLowerCase()] ??
      'application/octet-stream';
    const contentType =
      !upstreamContentType || upstreamContentType === 'application/octet-stream'
        ? fallbackContentType
        : upstreamContentType;
    this.logger.log('[DownloadFileUseCase] Execute finished');


    return {
      stream: Readable.fromWeb(upstream.body as any),
      fileName: `${file.name}.${file.extension}`,
      contentType,
      contentLength: upstream.headers.get('content-length') ?? undefined,
    };
  }
}



