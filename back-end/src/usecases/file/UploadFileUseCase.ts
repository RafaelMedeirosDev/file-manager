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
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';

export type UploadFileInput = {
  buffer: Buffer;
  name: string;
  requesterId: string;
  requesterRole: ROLE;
  folderId: string;
  extension: string;
  mimeType: string;
};

export type UploadFileOutput = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  extension: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UploadFileUseCase {
  private readonly logger = new Logger(UploadFileUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly folderRepository: FolderRepository,
    private readonly fileRepository: FileRepository,
  ) {}

  async execute(input: UploadFileInput): Promise<UploadFileOutput> {
    this.logger.log('[UploadFileUseCase] Execute started');

    // ── Validação: pasta existe e não foi deletada ───────
    const folder = await this.folderRepository.findById(input.folderId);

    if (!folder || folder.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND);
    }

    // ── Resolve o dono do arquivo ────────────────────────
    // ADMIN pode fazer upload em qualquer pasta — o dono é o dono da pasta.
    // USER só pode fazer upload nas próprias pastas.
    const isAdmin = input.requesterRole === ROLE.ADMIN;

    if (!isAdmin && folder.userId !== input.requesterId) {
      throw new BadRequestException(
        ErrorMessagesEnum.FOLDER_DOES_NOT_BELONG_TO_USER,
      );
    }

    const fileOwnerId = isAdmin ? folder.userId : input.requesterId;

    // ── Validação: dono existe e não foi deletado ────────
    const owner = await this.userRepository.findById(fileOwnerId);

    if (!owner || owner.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND);
    }

    // ── Upload para o R2 ─────────────────────────────────
    const key = `${randomUUID()}.${input.extension}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );

    this.logger.log(`[UploadFileUseCase] Uploaded to R2 with key: ${key}`);

    // ── Persiste no banco ────────────────────────────────
    const url = `${env.R2_PUBLIC_URL}/${key}`;

    const file = await this.fileRepository.create({
      name: input.name,
      userId: fileOwnerId,
      folderId: input.folderId,
      extension: input.extension,
      url,
    });

    this.logger.log('[UploadFileUseCase] Execute finished');

    return {
      id: file.id,
      name: file.name,
      userId: file.userId,
      folderId: file.folderId,
      extension: file.extension,
      url: file.url,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}
