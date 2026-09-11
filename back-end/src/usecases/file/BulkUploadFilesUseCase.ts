import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { File, ROLE } from '@prisma/client';
import { r2Client } from '../../shared/lib/r2Client';
import { env } from '../../config/env';
import { FileRepository } from '../../repositories/FileRepository';
import { FolderRepository } from '../../repositories/FolderRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';
import {
  BULK_UPLOAD_CONCURRENCY,
  canonicalMimeTypeFor,
  declaredMimeTypeMatches,
} from '../../shared/constants/upload.constants';

export type BulkUploadFileEntry = {
  buffer: Buffer;
  name: string;
  extension: string;
  mimeType: string;
};

export type BulkUploadFilesInput = {
  organizationId: string;
  files: BulkUploadFileEntry[];
  folderId: string;
  requesterId: string;
  requesterRole: ROLE;
};

export type BulkUploadFileResult = {
  name: string;
  extension: string;
  id?: string;
  error?: string;
};

export type BulkUploadFilesOutput = {
  results: BulkUploadFileResult[];
};

@Injectable()
export class BulkUploadFilesUseCase {
  private readonly logger = new Logger(BulkUploadFilesUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly folderRepository: FolderRepository,
    private readonly fileRepository: FileRepository,
  ) {}

  /**
   * Remove do bucket um objeto cujo registro no banco nao foi criado.
   *
   * A falha da propria limpeza e registrada e nao propagada: quem chamou
   * precisa ver o erro original, e o pior caso e voltar ao estado anterior a
   * esta compensacao -- um objeto orfao.
   */
  private async deleteOrphanObject(key: string): Promise<void> {
    try {
      await r2Client.send(
        new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
      );
      this.logger.warn(
        `[BulkUploadFilesUseCase] Rolled back orphan object from R2: ${key}`,
      );
    } catch {
      this.logger.error(
        `[BulkUploadFilesUseCase] Failed to roll back orphan object: ${key}`,
      );
    }
  }

  async execute(input: BulkUploadFilesInput): Promise<BulkUploadFilesOutput> {
    this.logger.log('[BulkUploadFilesUseCase] Execute started');

    // ── Validate folder once for all files ──────────────
    const folder = await this.folderRepository.findById(
      input.organizationId,
      input.folderId,
    );

    if (!folder || folder.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND);
    }

    const isAdmin = input.requesterRole === ROLE.ADMIN;

    if (!isAdmin && folder.userId !== input.requesterId) {
      throw new BadRequestException(
        ErrorMessagesEnum.FOLDER_DOES_NOT_BELONG_TO_USER,
      );
    }

    if (!isAdmin && !folder.isDefault) {
      throw new BadRequestException(
        ErrorMessagesEnum.UPLOAD_NOT_ALLOWED_IN_THIS_FOLDER,
      );
    }

    const fileOwnerId = isAdmin ? folder.userId : input.requesterId;

    const owner = await this.userRepository.findById(
      input.organizationId,
      fileOwnerId,
    );

    if (!owner || owner.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND);
    }

    // ── Upload de cada arquivo: R2 + banco ───────────────
    // Em lotes, nao tudo de uma vez. Sem o limite, 20 arquivos disputam 20
    // conexoes de um pool de 10 e mantem ate 200 MiB de buffers residentes.
    //
    // O resultado e gravado pelo indice de entrada, nao por push: a resposta
    // precisa manter a ordem em que os arquivos chegaram.
    const results: BulkUploadFileResult[] = new Array<BulkUploadFileResult>(
      input.files.length,
    );

    const processEntry = async (
      entry: (typeof input.files)[number],
    ): Promise<BulkUploadFileResult> => {
      try {
        // ── Validacao por arquivo ──────────────────────
        // Rejeicao individual entra no relatorio e o lote segue. Nao usamos
        // fileFilter do multer porque ele so permite abortar o lote inteiro
        // (cb(err)) ou descartar em silencio (cb(null, false)), e nenhum dos
        // dois produz o relatorio { name, extension, error }.
        if (entry.buffer.length > env.MAX_UPLOAD_SIZE_BYTES) {
          return {
            name: entry.name,
            extension: entry.extension,
            error: ErrorMessagesEnum.FILE_TOO_LARGE,
          };
        }

        const contentType = canonicalMimeTypeFor(entry.extension);

        if (
          !contentType ||
          !declaredMimeTypeMatches(entry.mimeType, contentType)
        ) {
          return {
            name: entry.name,
            extension: entry.extension,
            error: ErrorMessagesEnum.FILE_TYPE_NOT_ALLOWED,
          };
        }

        const key = `${randomUUID()}.${entry.extension}`;

        await r2Client.send(
          new PutObjectCommand({
            Bucket: env.R2_BUCKET_NAME,
            Key: key,
            Body: entry.buffer,
            ContentType: contentType,
          }),
        );

        // Mesma compensacao do upload unitario: sem ela, um insert que
        // falha deixa o objeto orfao e invisivel no bucket.
        let file: File;

        try {
          file = await this.fileRepository.create({
            organizationId: input.organizationId,
            name: entry.name,
            userId: fileOwnerId,
            folderId: input.folderId,
            extension: entry.extension,
            key,
          });
        } catch (error) {
          await this.deleteOrphanObject(key);
          throw error;
        }

        return {
          name: entry.name,
          extension: entry.extension,
          id: file.id,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(
          `[BulkUploadFilesUseCase] Failed to upload ${entry.name}: ${message}`,
        );
        return {
          name: entry.name,
          extension: entry.extension,
          error: ErrorMessagesEnum.UPLOAD_FAILED,
        };
      }
    };

    for (
      let offset = 0;
      offset < input.files.length;
      offset += BULK_UPLOAD_CONCURRENCY
    ) {
      const batch = input.files.slice(offset, offset + BULK_UPLOAD_CONCURRENCY);

      const batchResults = await Promise.all(batch.map(processEntry));

      batchResults.forEach((result, indexInBatch) => {
        results[offset + indexInBatch] = result;
      });
    }

    this.logger.log('[BulkUploadFilesUseCase] Execute finished');

    return { results };
  }
}
