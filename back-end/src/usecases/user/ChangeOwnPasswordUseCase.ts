import { BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException, Logger } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { UserRepository } from '../../repositories/UserRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

export type ChangeOwnPasswordInput = {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export type ChangeOwnPasswordOutput = {
  id: string;
  email: string;
  updatedAt: Date;
};

@Injectable()
export class ChangeOwnPasswordUseCase {
  private readonly logger = new Logger(ChangeOwnPasswordUseCase.name);
  private static readonly SALT_ROUNDS = 10;

  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: ChangeOwnPasswordInput): Promise<ChangeOwnPasswordOutput> {
    this.logger.log('[ChangeOwnPasswordUseCase] Execute started');
    const user = await this.userRepository.findById(input.userId);

    if (!user || user.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND);
    }

    if (input.newPassword !== input.confirmNewPassword) {
      throw new BadRequestException(
        ErrorMessagesEnum.PASSWORD_CONFIRMATION_DOES_NOT_MATCH,
      );
    }

    const isCurrentPasswordValid = await compare(
      input.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException(ErrorMessagesEnum.INVALID_CURRENT_PASSWORD);
    }

    const isSamePassword = await compare(input.newPassword, user.password);

    if (isSamePassword) {
      throw new BadRequestException(ErrorMessagesEnum.NEW_PASSWORD_MUST_BE_DIFFERENT);
    }

    const hashedPassword = await hash(
      input.newPassword,
      ChangeOwnPasswordUseCase.SALT_ROUNDS,
    );

    const updatedUser = await this.userRepository.updateById(user.id, {
      password: hashedPassword,
    });
    this.logger.log('[ChangeOwnPasswordUseCase] Execute finished');


    return {
      id: updatedUser.id,
      email: updatedUser.email,
      updatedAt: updatedUser.updatedAt,
    };
  }
}



