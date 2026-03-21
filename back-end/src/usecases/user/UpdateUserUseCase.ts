import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { hash } from 'bcrypt';
import { UserRepository } from '../../repositories/UserRepository';
import { ErrorMessagesEnum } from '../../shared/enums/ErrorMessagesEnum';

export type UpdateUserInput = {
  id: string;
  email?: string;
  password?: string;
};

export type UpdateUserOutput = {
  id: string;
  name: string;
  email: string;
  role: ROLE;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UpdateUserUseCase {
  private static readonly SALT_ROUNDS = 10;

  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: UpdateUserInput): Promise<UpdateUserOutput> {
    if (!input.email && !input.password) {
      throw new BadRequestException(ErrorMessagesEnum.AT_LEAST_ONE_FIELD_REQUIRED);
    }

    const existingUser = await this.userRepository.findById(input.id);

    if (!existingUser || existingUser.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND);
    }

    if (input.email) {
      const userWithSameEmail = await this.userRepository.findByEmail(input.email);

      if (userWithSameEmail && userWithSameEmail.id !== input.id) {
        throw new ConflictException(ErrorMessagesEnum.EMAIL_ALREADY_REGISTERED);
      }
    }

    const hashedPassword = input.password
      ? await hash(input.password, UpdateUserUseCase.SALT_ROUNDS)
      : undefined;

    const updatedUser = await this.userRepository.updateById(input.id, {
      email: input.email,
      password: hashedPassword,
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }
}
