import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { LoginDTO } from '../shared/dto/auth/LoginDTO';
import {
  ErrorMessagesEnum,
  type LoginAuthenticated,
  type LoginResponse,
} from '@file-manager/shared';
import { UserRepository } from '../repositories/UserRepository';
import {
  MembershipRepository,
  type MembershipWithUserAndOrganization,
} from '../repositories/MembershipRepository';
import {
  PRE_AUTH_TOKEN_EXPIRES_IN,
  TOKEN_AUDIENCE,
} from '../shared/constants/token.constants';
import type { SignedJwtClaims } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  /**
   * Monta a resposta autenticada a partir de uma associacao ja validada.
   *
   * Os claims sao tipados como SignedJwtClaims para que o `tsc` garanta a
   * presenca de `organizationId` -- antes o payload era um objeto literal
   * solto, e acrescentar campo ao tipo nao quebrava a compilacao aqui.
   *
   * `role` sai da associacao e entra apenas na resposta, nunca nos claims:
   * mantido fora do token, rebaixar alguem vale na requisicao seguinte.
   */
  private async buildAuthenticatedSession(
    membership: MembershipWithUserAndOrganization,
  ): Promise<LoginAuthenticated> {
    const claims: SignedJwtClaims = {
      sub: membership.user.id,
      email: membership.user.email,
      organizationId: membership.organizationId,
    };

    const accessToken = await this.jwtService.signAsync(claims, {
      audience: TOKEN_AUDIENCE.API,
    });

    return {
      status: 'authenticated',
      accessToken,
      user: {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
      },
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
      },
    };
  }

  /**
   * Passo 1: valida a credencial e resolve as organizacoes acessiveis.
   *
   * Com uma associacao ativa devolve a sessao direto; com duas ou mais devolve
   * um pre-auth e a lista para escolha. Zero associacoes e recusado com a
   * mesma mensagem de senha errada -- uma conta sem vinculo nao deve se
   * distinguir de uma conta inexistente.
   */
  async login(input: LoginDTO): Promise<LoginResponse> {
    const user = await this.userRepository.findByEmail(input.email);
    const isPasswordValid =
      user && !user.deletedAt
        ? await compare(input.password, user.password)
        : false;

    if (!user || user.deletedAt || !isPasswordValid) {
      throw new UnauthorizedException(
        ErrorMessagesEnum.INVALID_EMAIL_OR_PASSWORD,
      );
    }

    const memberships = await this.membershipRepository.listActiveByUserId(
      user.id,
    );

    if (memberships.length === 0) {
      throw new UnauthorizedException(
        ErrorMessagesEnum.INVALID_EMAIL_OR_PASSWORD,
      );
    }

    if (memberships.length === 1) {
      return this.buildAuthenticatedSession(memberships[0]);
    }

    const preAuthToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      {
        audience: TOKEN_AUDIENCE.PRE_AUTH,
        expiresIn: PRE_AUTH_TOKEN_EXPIRES_IN,
      },
    );

    return {
      status: 'organization_required',
      preAuthToken,
      user: { id: user.id, name: user.name, email: user.email },
      organizations: memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.role,
      })),
    };
  }

  /**
   * Passo 2: troca o pre-auth pelo token da organizacao escolhida.
   *
   * `requesterId` vem do pre-auth validado pela PreAuthJwtStrategy, nunca do
   * corpo da requisicao -- so por isso e seguro aceitar o organizationId do
   * cliente aqui.
   *
   * Os quatro modos de falha respondem 403 com a MESMA mensagem: nao e membro,
   * associacao desativada, usuario desativado, organizacao desativada.
   * Separa-los permitiria a quem tem uma credencial valida descobrir quais
   * organizacoes existem.
   */
  async createTokenForOrganization(
    requesterId: string,
    organizationId: string,
  ): Promise<LoginAuthenticated> {
    const membership =
      await this.membershipRepository.findByUserAndOrganization(
        requesterId,
        organizationId,
      );

    if (
      !membership ||
      membership.deletedAt ||
      membership.user.deletedAt ||
      membership.organization.deletedAt
    ) {
      throw new ForbiddenException(
        ErrorMessagesEnum.ORGANIZATION_ACCESS_FORBIDDEN,
      );
    }

    return this.buildAuthenticatedSession(membership);
  }
}
