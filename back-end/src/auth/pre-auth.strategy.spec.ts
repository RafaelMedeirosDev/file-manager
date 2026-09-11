import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLE } from '@prisma/client';
import passport from 'passport';
import { PreAuthClaims, PreAuthJwtStrategy } from './pre-auth.strategy';
import { UserRepository } from '../repositories/UserRepository';

const USER_ID = 'user-uuid-001';

const claims: PreAuthClaims = {
  sub: USER_ID,
  email: 'user@filemanager.dev',
};

function userMock(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    name: 'Usuario Comum',
    email: 'user@filemanager.dev',
    password: 'hash-irrelevante-aqui',
    role: ROLE.USER,
    deletedAt: null,
    ...overrides,
  };
}

const mockUserRepository = { findByIdAcrossOrganizations: jest.fn() };

describe('PreAuthJwtStrategy', () => {
  let strategy: PreAuthJwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreAuthJwtStrategy,
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    }).compile();

    strategy = module.get<PreAuthJwtStrategy>(PreAuthJwtStrategy);
    jest.clearAllMocks();
  });

  it('registers itself under an explicit name, so it does not shadow the api strategy', () => {
    // O nome NAO fica na instancia: `passport-jwt` fixa `this.name = 'jwt'` no
    // proprio construtor, e o segundo argumento de PassportStrategy vai para
    // `passport.use(name, strategy)` -- ou seja, para a chave do registro.
    // E la que a assercao tem valor.
    //
    // Se o nome for omitido, esta strategy assume a chave 'jwt' e as rotas de
    // negocio passam a aceitar token pre-auth. Falha silenciosa, dai o teste.
    const registry = (
      passport as unknown as { _strategies: Record<string, unknown> }
    )._strategies;

    expect(registry['jwt-pre-auth']).toBe(strategy);
    expect(registry['jwt']).not.toBe(strategy);
  });

  it('accepts an existing user and exposes no organization', async () => {
    mockUserRepository.findByIdAcrossOrganizations.mockResolvedValue(
      userMock(),
    );

    const output = await strategy.validate(claims);

    expect(output).toEqual({ sub: USER_ID, email: 'user@filemanager.dev' });
    // Escolher a organizacao e justamente o que falta neste passo.
    expect(output).not.toHaveProperty('organizationId');
    expect(output).not.toHaveProperty('role');
    expect(mockUserRepository.findByIdAcrossOrganizations).toHaveBeenCalledWith(
      USER_ID,
    );
  });

  it('rejects a user that no longer exists', async () => {
    mockUserRepository.findByIdAcrossOrganizations.mockResolvedValue(null);

    await expect(strategy.validate(claims)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a soft-deleted user', async () => {
    mockUserRepository.findByIdAcrossOrganizations.mockResolvedValue(
      userMock({ deletedAt: new Date('2026-03-01T00:00:00.000Z') }),
    );

    await expect(strategy.validate(claims)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
