import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { hash } from 'bcrypt';
import { UserRepository } from '../../repositories/UserRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { BCRYPT_SALT_ROUNDS } from '../../shared/constants/bcrypt.constants';

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

  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    input: CreateUserWithFoldersInput,
  ): Promise<CreateUserWithFoldersOutput> {
    this.logger.log('[CreateUserWithFoldersUseCase] Execute started');

    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictException(ErrorMessagesEnum.EMAIL_ALREADY_REGISTERED);
    }

    const hashedPassword = await hash(input.password, BCRYPT_SALT_ROUNDS);

    // Deduplicacao em memoria, nao no banco: o usuario esta sendo criado agora,
    // entao nao existe pasta dele com que colidir. A versao anterior fazia um
    // findActiveByUserIdAndName por nome -- ate 20 idas ao Postgres para
    // deduplicar um array que ja estava na mao.
    const defaultFolderName = input.name;
    const extraFolderNames: string[] = [];
    const seenNames = new Set<string>([defaultFolderName]);

    for (const folderName of input.folders ?? []) {
      if (seenNames.has(folderName)) {
        this.logger.warn(
          '[CreateUserWithFoldersUseCase] Skipping duplicate folder name',
          { folderName },
        );
        continue;
      }

      seenNames.add(folderName);
      extraFolderNames.push(folderName);
    }

    // Uma transacao: ou o usuario nasce com todas as pastas, ou nao nasce.
    const { user, folders } = await this.userRepository.createWithFolders({
      user: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: ROLE.USER,
      },
      defaultFolderName,
      extraFolderNames,
    });

    const createdFolders: CreatedFolderOutput[] = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
    }));

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
