import { Injectable } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { UserRepository } from '../../repositories/UserRepository';

export type ListUsersOutput = {
  data: Array<{
    id: string;
    name: string;
    email: string;
    role: ROLE;
    createdAt: Date;
    updatedAt: Date;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
};

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input?: { page?: number; limit?: number }): Promise<ListUsersOutput> {
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 10;

    const users = await this.userRepository.findAll();

    const activeUsers = users
      .filter((user) => !user.deletedAt)
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

    const total = activeUsers.length;
    const start = (page - 1) * limit;
    const paginatedUsers = activeUsers.slice(start, start + limit);

    return {
      data: paginatedUsers,
      meta: {
        page,
        limit,
        total,
        hasNextPage: start + limit < total,
      },
    };
  }
}
