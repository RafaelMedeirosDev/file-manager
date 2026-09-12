import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLE } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { CreateUserWithFoldersUseCase } from './CreateUserWithFoldersUseCase';
import { UserRepository } from '../../repositories/UserRepository';

jest.mock('bcrypt', () => ({ hash: jest.fn() }));
import { hash } from 'bcrypt';

const ORGANIZATION_ID = 'org-uuid-principal';

const hashMock = jest.mocked(hash);

// ── Factories ────────────────────────────────────────────
function userMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-001',
    name: 'Alice',
    email: 'alice@example.com',
    role: ROLE.USER,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function folderMock(overrides: Record<string, unknown> = {}) {
  return { id: 'folder-default', name: 'Alice', ...overrides };
}

const input = {
  organizationId: ORGANIZATION_ID,
  name: 'Alice',
  email: 'alice@example.com',
  password: 'plain-password',
};

/**
 * O papel vem da associacao criada na mesma transacao, e nao de `users.role`.
 */
function membershipMock(overrides: { role?: ROLE } = {}) {
  return {
    id: 'membership-uuid-001',
    userId: 'user-uuid-001',
    organizationId: ORGANIZATION_ID,
    role: overrides.role ?? ROLE.USER,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };
}

// ── Mock repositories ────────────────────────────────────
const mockUserRepository = {
  findByEmail: jest.fn(),
  createWithFolders: jest.fn(),
};

// ── Suite ────────────────────────────────────────────────
describe('CreateUserWithFoldersUseCase', () => {
  let useCase: CreateUserWithFoldersUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserWithFoldersUseCase,
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    }).compile();

    useCase = module.get<CreateUserWithFoldersUseCase>(
      CreateUserWithFoldersUseCase,
    );
    jest.clearAllMocks();
    hashMock.mockResolvedValue('hashed-password' as never);
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.createWithFolders.mockResolvedValue({
      user: userMock(),
      membership: membershipMock(),
      folders: [folderMock()],
    });
  });

  it('reads the role from the membership created in the same transaction', async () => {
    // Divergentes de proposito. `users.role` sera dropada no contract; o papel
    // exibido tem de vir da associacao mesmo quando os dois discordam.
    mockUserRepository.createWithFolders.mockResolvedValue({
      user: userMock({ role: ROLE.USER }),
      membership: membershipMock({ role: ROLE.ADMIN }),
      folders: [folderMock()],
    });

    const output = await useCase.execute(input);

    expect(output.role).toBe(ROLE.ADMIN);
  });

  // ── Happy path ─────────────────────────────────────────
  describe('should be able to create a user with folders with success', () => {
    it('always creates the default folder named after the user', async () => {
      const output = await useCase.execute(input);

      // Uma unica chamada, transacional: o nome da pasta padrao e o do usuario.
      expect(mockUserRepository.createWithFolders).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.createWithFolders).toHaveBeenCalledWith({
        organizationId: ORGANIZATION_ID,
        user: {
          name: 'Alice',
          email: 'alice@example.com',
          password: 'hashed-password',
          role: ROLE.USER,
        },
        defaultFolderName: 'Alice',
        extraFolderNames: [],
      });
      expect(output.folders).toEqual([{ id: 'folder-default', name: 'Alice' }]);
    });

    it('passes the extra folder names along with the default one', async () => {
      mockUserRepository.createWithFolders.mockResolvedValue({
        user: userMock(),
        membership: membershipMock(),
        folders: [
          folderMock(),
          folderMock({ id: 'folder-exams', name: 'Exames' }),
        ],
      });

      const output = await useCase.execute({ ...input, folders: ['Exames'] });

      expect(mockUserRepository.createWithFolders).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultFolderName: 'Alice',
          extraFolderNames: ['Exames'],
        }),
      );
      expect(output.folders).toEqual([
        { id: 'folder-default', name: 'Alice' },
        { id: 'folder-exams', name: 'Exames' },
      ]);
    });

    it('drops a repeated folder name without touching the database', async () => {
      // A deduplicacao acontece em memoria: nao ha consulta por nome.
      await useCase.execute({
        ...input,
        folders: ['Exames', 'Exames', 'Laudos'],
      });

      expect(mockUserRepository.createWithFolders).toHaveBeenCalledWith(
        expect.objectContaining({ extraFolderNames: ['Exames', 'Laudos'] }),
      );
    });

    it('drops an extra folder that repeats the default folder name', async () => {
      await useCase.execute({ ...input, folders: ['Alice', 'Exames'] });

      expect(mockUserRepository.createWithFolders).toHaveBeenCalledWith(
        expect.objectContaining({ extraFolderNames: ['Exames'] }),
      );
    });
  });

  // ── Error cases ────────────────────────────────────────
  describe('should not be able to create a user with folders if', () => {
    it('the email is already registered', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(userMock());

      await expect(useCase.execute(input)).rejects.toThrow(
        new ConflictException(ErrorMessagesEnum.EMAIL_ALREADY_REGISTERED),
      );

      expect(mockUserRepository.createWithFolders).not.toHaveBeenCalled();
    });

    it('persists nothing when the transaction fails midway', async () => {
      // Antes as escritas eram autocommits separados: uma falha na terceira
      // pasta deixava o usuario criado com o conjunto truncado, e sem retry
      // possivel -- o e-mail ja estava gravado. Agora a operacao e uma so.
      mockUserRepository.createWithFolders.mockRejectedValue(
        new Error('deadlock detected'),
      );

      await expect(
        useCase.execute({ ...input, folders: ['A', 'B', 'C'] }),
      ).rejects.toThrow('deadlock detected');
    });
  });
});
