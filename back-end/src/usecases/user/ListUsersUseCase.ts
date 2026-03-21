import { Injectable } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { UserRepository } from '../../repositories/UserRepository';

export type ListUsersOutput = Array<{
  id: string;
  name: string;
  email: string;
  role: ROLE;
  createdAt: Date;
  updatedAt: Date;
}>;

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(): Promise<ListUsersOutput> {
    const users = await this.userRepository.findAll();

    return users
      .filter((user) => !user.deletedAt)
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
  }
}
