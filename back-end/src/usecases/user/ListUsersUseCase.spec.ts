import { ROLE } from '@prisma/client';
import { UserRepository } from '../../repositories/UserRepository';
import { ListUsersUseCase } from './ListUsersUseCase';

describe('ListUsersUseCase', () => {
  const users = [
    {
      id: '1',
      name: 'Carla Souza',
      email: 'ana@company.com',
      password: 'secret',
      role: ROLE.USER,
      createdAt: new Date('2024-01-04T00:00:00.000Z'),
      updatedAt: new Date('2024-01-04T00:00:00.000Z'),
      deletedAt: null,
    },
    {
      id: '2',
      name: 'Ana Admin',
      email: 'ana.admin@example.com',
      password: 'secret',
      role: ROLE.ADMIN,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      deletedAt: null,
    },
    {
      id: '3',
      name: 'Bruno Costa',
      email: 'finance@example.com',
      password: 'secret',
      role: ROLE.USER,
      createdAt: new Date('2024-01-03T00:00:00.000Z'),
      updatedAt: new Date('2024-01-03T00:00:00.000Z'),
      deletedAt: null,
    },
    {
      id: '4',
      name: 'Ana Clara',
      email: 'clara@example.com',
      password: 'secret',
      role: ROLE.USER,
      createdAt: new Date('2024-01-02T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      deletedAt: null,
    },
    {
      id: '5',
      name: 'Deleted User',
      email: 'deleted@example.com',
      password: 'secret',
      role: ROLE.USER,
      createdAt: new Date('2024-01-05T00:00:00.000Z'),
      updatedAt: new Date('2024-01-05T00:00:00.000Z'),
      deletedAt: new Date('2024-01-05T00:00:00.000Z'),
    },
  ];

  const findAll = jest.fn();
  let useCase: ListUsersUseCase;

  beforeEach(() => {
    findAll.mockResolvedValue(users);
    useCase = new ListUsersUseCase({
      findAll,
    } as unknown as UserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('searches by name or email with OR semantics', async () => {
    const output = await useCase.execute({ search: 'ANa' });

    expect(output.data.map((user) => user.name)).toEqual([
      'Ana Admin',
      'Ana Clara',
      'Carla Souza',
    ]);
    expect(output.meta.total).toBe(3);
    expect(output.meta.hasNextPage).toBe(false);
  });

  it('keeps legacy name and email filters working', async () => {
    const byName = await useCase.execute({ name: 'brun' });
    const byEmail = await useCase.execute({ email: 'company.com' });

    expect(byName.data.map((user) => user.name)).toEqual(['Bruno Costa']);
    expect(byEmail.data.map((user) => user.name)).toEqual(['Carla Souza']);
  });

  it('combines search with legacy filters using AND semantics', async () => {
    const output = await useCase.execute({
      search: 'ana',
      name: 'carla',
      email: 'company.com',
    });

    expect(output.data.map((user) => user.name)).toEqual(['Carla Souza']);
    expect(output.meta.total).toBe(1);
  });

  it('preserves pagination and alphabetical ordering', async () => {
    const output = await useCase.execute({ page: 2, limit: 2 });

    expect(output.data.map((user) => user.name)).toEqual([
      'Bruno Costa',
      'Carla Souza',
    ]);
    expect(output.meta).toEqual({
      page: 2,
      limit: 2,
      total: 4,
      hasNextPage: false,
    });
  });
});
