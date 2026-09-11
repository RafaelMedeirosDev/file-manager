import { JwtService } from '@nestjs/jwt';
import {
  PRE_AUTH_TOKEN_EXPIRES_IN,
  TOKEN_AUDIENCE,
} from '../shared/constants/token.constants';

type DecodedToken = { aud?: string; exp?: number; iat?: number };

const ONE_DAY_IN_SECONDS = 24 * 60 * 60;
const FIVE_MINUTES_IN_SECONDS = 5 * 60;

/**
 * Verifica o lado da EMISSAO do token, com um JwtService de verdade e sem
 * mock. As specs de AuthService provam que as opcoes certas sao passadas; esta
 * prova que elas produzem o token esperado.
 *
 * Importa porque a separacao entre pre-auth e sessao e a audiencia gravada no
 * token, e porque o `expiresIn` do pre-auth precisa SOBREPOR o do modulo -- se
 * o @nestjs/jwt substituisse as opcoes em vez de fazer merge, um pre-auth
 * valeria um dia.
 *
 * Configurado igual ao JwtModule.register de auth.module.ts.
 */
describe('token audience and lifetime', () => {
  const jwtService = new JwtService({
    secret: 'segredo-de-teste',
    signOptions: { expiresIn: '1d' },
  });

  function decode(token: string): DecodedToken {
    return jwtService.decode<DecodedToken>(token);
  }

  it('stamps the api audience and keeps the module lifetime of one day', async () => {
    const token = await jwtService.signAsync(
      { sub: 'user-1', email: 'user@x.dev', organizationId: 'org-1' },
      { audience: TOKEN_AUDIENCE.API },
    );

    const decoded = decode(token);

    expect(decoded.aud).toBe('api');
    // Merge, e nao substituicao: o expiresIn do modulo sobrevive a uma chamada
    // que passa apenas `audience`.
    expect(decoded.exp! - decoded.iat!).toBe(ONE_DAY_IN_SECONDS);
  });

  it('stamps the pre-auth audience and lets the per-call lifetime win', async () => {
    const token = await jwtService.signAsync(
      { sub: 'user-1', email: 'user@x.dev' },
      {
        audience: TOKEN_AUDIENCE.PRE_AUTH,
        expiresIn: PRE_AUTH_TOKEN_EXPIRES_IN,
      },
    );

    const decoded = decode(token);

    expect(decoded.aud).toBe('pre-auth');
    expect(decoded.exp! - decoded.iat!).toBe(FIVE_MINUTES_IN_SECONDS);
  });

  it('refuses a token whose audience does not match on verify', async () => {
    // E a garantia que sustenta o desenho: quem verifica exigindo `api`
    // recusa um pre-auth na checagem da assinatura, antes de qualquer codigo
    // da aplicacao rodar. As strategies declaram exatamente esta opcao.
    const preAuthToken = await jwtService.signAsync(
      { sub: 'user-1', email: 'user@x.dev' },
      { audience: TOKEN_AUDIENCE.PRE_AUTH },
    );

    await expect(
      jwtService.verifyAsync(preAuthToken, {
        audience: TOKEN_AUDIENCE.API,
      }),
    ).rejects.toThrow(/audience/i);

    // E o caminho positivo, para o teste nao passar por acidente.
    await expect(
      jwtService.verifyAsync(preAuthToken, {
        audience: TOKEN_AUDIENCE.PRE_AUTH,
      }),
    ).resolves.toMatchObject({ sub: 'user-1', aud: 'pre-auth' });
  });
});
