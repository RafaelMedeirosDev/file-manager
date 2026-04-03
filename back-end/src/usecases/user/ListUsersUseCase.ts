import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(ListUsersUseCase.name);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(input?: {
    page?: number;
    limit?: number;
    search?: string;
    name?: string;
    email?: string;
  }): Promise<ListUsersOutput> {
    this.logger.log('[ListUsersUseCase] Execute started');

    const page = input?.page ?? 1;
    const limit = input?.limit ?? 10;
    const normalizedSearch = input?.search?.trim().toLowerCase();
    const normalizedName = input?.name?.trim().toLowerCase();
    const normalizedEmail = input?.email?.trim().toLowerCase();

    const users = await this.userRepository.findAll();

    const filteredUsers = users.filter((user) => {
      if (user.deletedAt) {
        return false;
      }

      if (
        normalizedSearch &&
        !user.name.toLowerCase().includes(normalizedSearch) &&
        !user.email.toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }

      if (normalizedName && !user.name.toLowerCase().includes(normalizedName)) {
        return false;
      }

      if (normalizedEmail && !user.email.toLowerCase().includes(normalizedEmail)) {
        return false;
      }

      return true;
    });

    const mappedUsers = filteredUsers
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
      );

    const total = mappedUsers.length;
    const start = (page - 1) * limit;
    const paginatedUsers = mappedUsers.slice(start, start + limit);

    this.logger.log('[ListUsersUseCase] Execute finished');

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
