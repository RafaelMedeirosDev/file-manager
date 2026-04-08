import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { hash } from 'bcrypt';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { UserRepository } from '../../repositories/UserRepository';
import { BCRYPT_SALT_ROUNDS } from '../../shared/constants/bcrypt.constants';

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
};

export type CreateUserOutput = {
  id: string;
  name: string;
  email: string;
  role: ROLE;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    this.logger.log('[CreateUserUseCase] Execute started');
    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictException(ErrorMessagesEnum.EMAIL_ALREADY_REGISTERED);
    }

    const hashedPassword = await hash(
      input.password,
      BCRYPT_SALT_ROUNDS,
    );

    const user = await this.userRepository.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: ROLE.USER,
    });

    this.logger.log('[CreateUserUseCase] Execute finished');


    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}



