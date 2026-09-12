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

  async execute(input: {
    organizationId: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ListUsersOutput> {
    this.logger.log('[ListUsersUseCase] Execute started');

    const page = input.page ?? 1;
    const limit = input.limit ?? 10;
    const skip = (page - 1) * limit;
    const normalizedSearch = input.search?.trim().toLowerCase();

    const users = await this.userRepository.listUsersActive({
      organizationId: input.organizationId,
      search: normalizedSearch,
      skip,
      take: limit,
    });
    const totalUsers = await this.userRepository.countActiveUsers({
      organizationId: input.organizationId,
      search: normalizedSearch,
    });

    const paginatedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      // `memberships[0]` e seguro: o `where` da consulta exige uma associacao
      // ativa nesta organizacao, e a unique (user_id, organization_id) garante
      // que existe no maximo uma. Um fallback aqui reintroduziria exatamente o
      // bug que este mapeamento corrige -- um papel plausivel e errado.
      role: user.memberships[0].role,
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
