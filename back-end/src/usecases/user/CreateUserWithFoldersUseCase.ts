import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { hash } from 'bcrypt';
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';
import { UserRepository } from '../../repositories/UserRepository';
import { FolderRepository } from '../../repositories/FolderRepository';

export type CreateUserWithFoldersInput = {
  name: string;
  email: string;
  password: string;
  folders?: string[];
};

export type CreatedFolderOutput = {
  id: string;
  name: string;
};

export type CreateUserWithFoldersOutput = {
  id: string;
  name: string;
  email: string;
  role: ROLE;
  createdAt: Date;
  updatedAt: Date;
  folders: CreatedFolderOutput[];
};

@Injectable()
export class CreateUserWithFoldersUseCase {
  private readonly logger = new Logger(CreateUserWithFoldersUseCase.name);
  private static readonly SALT_ROUNDS = 10;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly folderRepository: FolderRepository,
  ) {}

  async execute(input: CreateUserWithFoldersInput): Promise<CreateUserWithFoldersOutput> {
    this.logger.log('[CreateUserWithFoldersUseCase] Execute started');

    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictException(ErrorMessagesEnum.EMAIL_ALREADY_REGISTERED);
    }

    const hashedPassword = await hash(
      input.password,
      CreateUserWithFoldersUseCase.SALT_ROUNDS,
    );

    const user = await this.userRepository.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: ROLE.USER,
    });

    const createdFolders: CreatedFolderOutput[] = [];

    for (const folderName of input.folders ?? []) {
      const duplicate = await this.folderRepository.findActiveByUserIdAndName({
        userId: user.id,
        name: folderName,
      });

      if (duplicate) {
        this.logger.warn(
          '[CreateUserWithFoldersUseCase] Skipping duplicate folder name',
          { userId: user.id, folderName },
        );
        continue;
      }

      const folder = await this.folderRepository.create({
        name: folderName,
        userId: user.id,
      });

      createdFolders.push({ id: folder.id, name: folder.name });
    }

    this.logger.log('[CreateUserWithFoldersUseCase] Execute finished', {
      userId: user.id,
      foldersCreated: createdFolders.length,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      folders: createdFolders,
    };
  }
}
