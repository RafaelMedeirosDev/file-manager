import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SKIP_JWT_AUTH_KEY } from './skip-jwt-auth.decorator';

function contextMock(): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
}

/**
 * O prototipo do mixin que `AuthGuard('jwt')` produz. Espionar `canActivate`
 * aqui e a forma direta de afirmar se a delegacao ao passport aconteceu, sem
 * precisar montar um contexto HTTP completo para o passport rodar de verdade
 * -- validar token e trabalho da JwtStrategy, coberto na spec dela.
 */
const passportPrototype = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
  canActivate: (context: ExecutionContext) => unknown;
};

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let guard: JwtAuthGuard;
  let superCanActivate: jest.SpyInstance;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
    superCanActivate = jest
      .spyOn(passportPrototype, 'canActivate')
      .mockReturnValue(Promise.resolve(true));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lets the request through without touching passport when @SkipJwtAuth is declared', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    expect(guard.canActivate(contextMock())).toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  it('reads the metadata from handler and class, so a method can override the controller', async () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(true);

    await guard.canActivate(contextMock());

    expect(spy).toHaveBeenCalledWith(SKIP_JWT_AUTH_KEY, [
      expect.any(Function),
      expect.any(Function),
    ]);
  });

  it('delegates to passport when the route declares nothing', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = contextMock();
    await guard.canActivate(context);

    expect(superCanActivate).toHaveBeenCalledWith(context);
  });

  it('delegates to passport when the metadata is explicitly false', async () => {
    // Guarda contra um `@SetMetadata(SKIP_JWT_AUTH_KEY, false)` acidental
    // abrir a rota: so um valor verdadeiro pula o guard.
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    await guard.canActivate(contextMock());

    expect(superCanActivate).toHaveBeenCalled();
  });
});
