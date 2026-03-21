import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../repositories/UserRepository';
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';

export type SoftDeleteUserInput = {
  id: string;
};

export type SoftDeleteUserOutput = {
  id: string;
  name: string;
  email: string;
  deletedAt: string;
};

@Injectable()
export class SoftDeleteUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: SoftDeleteUserInput): Promise<SoftDeleteUserOutput> {
    const existingUser = await this.userRepository.findById(input.id);

    if (!existingUser || existingUser.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND);
    }

    const deletedAt = new Date();
    const deletedUser = await this.userRepository.softDeleteById(
      input.id,
      deletedAt,
    );

    return {
      id: deletedUser.id,
      name: deletedUser.name,
      email: deletedUser.email,
      deletedAt: deletedAt.toISOString(),
    };
  }
}
