import { Injectable } from '@nestjs/common';
import { ROLE, User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    name: string;
    email: string;
    password: string;
    role: ROLE;
  }): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  listUsersActive(search?: string, skip?: number, take?: number): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(search ? {
          OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      } : {}),
      },
      skip,
      take,
  });
  }

  countActiveUsers(search?: string): Promise<number> {
    return this.prisma.user.count({
      where: {
        deletedAt: null,
        ...(search ? {
          OR: [
          {
             name: {
               contains: search,
               mode: 'insensitive',
             },
            },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
        }: {}),
      },
   });
  }

  updateById(
    id: string,
    data: {
      email?: string;
      password?: string;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  softDeleteById(id: string, deletedAt: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt },
    });
  }
}
