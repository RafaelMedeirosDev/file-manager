import {
  BadGatewayException,
  ForbiddenException,
  GatewayTimeoutException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import {
  GetObjectCommand,
  NoSuchKey,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { ROLE } from '@prisma/client';
import { r2Client } from '../../shared/lib/r2Client';
import { env } from '../../config/env';
import { FileRepository } from '../../repositories/FileRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';
import {
  DEFAULT_UPLOAD_CONTENT_TYPE,
  MIME_BY_EXTENSION,
} from '../../shared/constants/upload.constants';

export type DownloadFileInput = {
  organizationId: string;
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

  constructor(private readonly fileRepository: FileRepository) {}

  async execute(input: DownloadFileInput): Promise<DownloadFileOutput> {
    this.logger.log('[DownloadFileUseCase] Execute started');
    const file = await this.fileRepository.findById(
      input.organizationId,
      input.id,
    );

    if (!file || file.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND);
    }

    if (
      input.requesterRole !== ROLE.ADMIN &&
      file.userId !== input.requesterUserId
    ) {
      throw new ForbiddenException(ErrorMessagesEnum.FILE_ACCESS_FORBIDDEN);
    }

    // O binario e lido com as credenciais da aplicacao, nunca por uma URL
    // vinda do banco. Isso permite que o bucket seja privado e remove o
    // vetor de SSRF que existia enquanto o download fazia fetch em file.url.
    let object: GetObjectCommandOutput;

    try {
      object = await r2Client.send(
        new GetObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: file.key,
        }),
        {
          abortSignal: AbortSignal.timeout(
            DownloadFileUseCase.DOWNLOAD_TIMEOUT_MS,
          ),
        },
      );
    } catch (error) {
      // Objeto ausente no bucket: o registro existe no banco mas o binario
      // nao, entao 404 descreve melhor a situacao do que um erro de gateway.
      if (error instanceof NoSuchKey) {
        throw new NotFoundException(ErrorMessagesEnum.FILE_NOT_FOUND);
      }

      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new GatewayTimeoutException(
          ErrorMessagesEnum.FILE_DOWNLOAD_TIMEOUT,
        );
      }

      throw new BadGatewayException(
        ErrorMessagesEnum.FILE_DOWNLOAD_UNAVAILABLE,
      );
    }

    if (!object.Body) {
      throw new BadGatewayException(
        ErrorMessagesEnum.FILE_DOWNLOAD_UNAVAILABLE,
      );
    }

    // O Content-Type gravado no upload ja e o canonico da extensao; o mapa
    // local cobre objetos antigos que subiram sem o cabecalho.
    const storedContentType = object.ContentType?.split(';')[0]
      .trim()
      .toLowerCase();
    const fallbackContentType =
      MIME_BY_EXTENSION[file.extension.toLowerCase()] ??
      DEFAULT_UPLOAD_CONTENT_TYPE;
    const contentType =
      !storedContentType || storedContentType === DEFAULT_UPLOAD_CONTENT_TYPE
        ? fallbackContentType
        : storedContentType;

    this.logger.log('[DownloadFileUseCase] Execute finished');

    return {
      stream: object.Body as Readable,
      fileName: `${file.name}.${file.extension}`,
      contentType,
      contentLength: object.ContentLength?.toString(),
    };
  }
}
