import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { ROLE } from '@prisma/client';
import { r2Client } from '../../shared/lib/r2Client';
import { env } from '../../config/env';
import { FileRepository } from '../../repositories/FileRepository';
import { FolderRepository } from '../../repositories/FolderRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

export type BulkUploadFileEntry = {
  buffer: Buffer;
  name: string;
  extension: string;
  mimeType: string;
};

export type BulkUploadFilesInput = {
  files: BulkUploadFileEntry[];
  folderId: string;
  requesterId: string;
  requesterRole: ROLE;
};

export type BulkUploadFileResult = {
  name: string;
  extension: string;
  id?: string;
  url?: string;
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

  async execute(input: BulkUploadFilesInput): Promise<BulkUploadFilesOutput> {
    this.logger.log('[BulkUploadFilesUseCase] Execute started');

    // ── Validate folder once for all files ──────────────
    const folder = await this.folderRepository.findById(input.folderId);

    if (!folder || folder.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND);
    }

    const isAdmin = input.requesterRole === ROLE.ADMIN;

    if (!isAdmin && folder.userId !== input.requesterId) {
      throw new BadRequestException(
        ErrorMessagesEnum.FOLDER_DOES_NOT_BELONG_TO_USER,
      );
    }

    const fileOwnerId = isAdmin ? folder.userId : input.requesterId;

    const owner = await this.userRepository.findById(fileOwnerId);

    if (!owner || owner.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND);
    }

    // ── Upload each file to R2 + DB in parallel ──────────
    const results = await Promise.all(
      input.files.map(async (entry): Promise<BulkUploadFileResult> => {
        try {
          const key = `${randomUUID()}.${entry.extension}`;

          await r2Client.send(
            new PutObjectCommand({
              Bucket: env.R2_BUCKET_NAME,
              Key: key,
              Body: entry.buffer,
              ContentType: entry.mimeType,
            }),
          );

          const url = `${env.R2_PUBLIC_URL}/${key}`;

          const file = await this.fileRepository.create({
            name: entry.name,
            userId: fileOwnerId,
            folderId: input.folderId,
            extension: entry.extension,
            url,
          });

          return { name: entry.name, extension: entry.extension, id: file.id, url: file.url };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed';
          this.logger.error(`[BulkUploadFilesUseCase] Failed to upload ${entry.name}: ${message}`);
          return { name: entry.name, extension: entry.extension, error: message };
        }
      }),
    );

    this.logger.log('[BulkUploadFilesUseCase] Execute finished');

    return { results };
  }
}
