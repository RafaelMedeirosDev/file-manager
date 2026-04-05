import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UserRepository } from '../../repositories/UserRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

export type SoftDeleteUserInput = {
  id: string;
  requesterId: string;
};

export type SoftDeleteUserOutput = {
  id: string;
  name: string;
  email: string;
  deletedAt: string;
};

@Injectable()
export class SoftDeleteUserUseCase {
  private readonly logger = new Logger(SoftDeleteUserUseCase.name);
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: SoftDeleteUserInput): Promise<SoftDeleteUserOutput> {
    this.logger.log('[SoftDeleteUserUseCase] Execute started');

    if (input.requesterId === input.id) {
      throw new ForbiddenException(ErrorMessagesEnum.CANNOT_DELETE_SELF);
    }

    const existingUser = await this.userRepository.findById(input.id);

    if (!existingUser || existingUser.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND);
    }

    const deletedAt = new Date();
    const deletedUser = await this.userRepository.softDeleteById(
      input.id,
      deletedAt,
    );
    this.logger.log('[SoftDeleteUserUseCase] Execute finished');

    return {
      id: deletedUser.id,
      name: deletedUser.name,
      email: deletedUser.email,
      deletedAt: deletedAt.toISOString(),
    };
  }
}
