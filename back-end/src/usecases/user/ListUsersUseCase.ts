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
  }): Promise<ListUsersOutput> {
    this.logger.log('[ListUsersUseCase] Execute started');

    const page = input?.page ?? 1;
    const limit = input?.limit ?? 10;
    const skip = (page - 1) * limit;
    const normalizedSearch = input?.search?.trim().toLowerCase();

    const users = await this.userRepository.listUsersActive(normalizedSearch, skip, limit);
    const totalUsers = await this.userRepository.countActiveUsers(normalizedSearch);

    const paginatedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
    this.logger.log('[ListUsersUseCase] Execute finished');

    return {
      data: paginatedUsers,
      meta: {
        page,
        limit,
        total: totalUsers,
        hasNextPage: totalUsers > skip + limit,
      },
    };
  }
}
