import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { MembershipRepository } from '../../repositories/MembershipRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

export type SoftDeleteUserInput = {
  organizationId: string;
  id: string;
  requesterId: string;
};

export type SoftDeleteUserOutput = {
  id: string;
  name: string;
  email: string;
  deletedAt: string;
};

@Injectable()
export class SoftDeleteUserUseCase {
  private readonly logger = new Logger(SoftDeleteUserUseCase.name);
  constructor(private readonly membershipRepository: MembershipRepository) {}

  /**
   * Desliga o usuario da organizacao, em vez de apagar a linha de `users`.
   *
   * Antes este use case fazia soft delete do usuario global, o que o mataria
   * em TODAS as organizacoes -- um ADMIN da organizacao de demonstracao, cuja
   * credencial e publica, poderia excluir a conta real do operador.
   *
   * O efeito visivel e o mesmo dentro da organizacao: sem associacao ativa o
   * usuario some de todas as listagens (elas recortam por associacao) e o
   * passo 1 do login recusa quem ficou sem nenhuma. O contrato de saida nao
   * muda, entao o frontend nao percebe diferenca.
   */
  async execute(input: SoftDeleteUserInput): Promise<SoftDeleteUserOutput> {
    this.logger.log('[SoftDeleteUserUseCase] Execute started');

    if (input.requesterId === input.id) {
      throw new ForbiddenException(ErrorMessagesEnum.CANNOT_DELETE_SELF);
    }

    const membership =
      await this.membershipRepository.findByUserAndOrganization(
        input.id,
        input.organizationId,
      );

    // Uma associacao ja desligada e tratada como inexistente, igual ao
    // criterio de deletedAt do resto do projeto. Cobre tambem o caso de um id
    // de usuario de outra organizacao: nao ha associacao, logo 404.
    if (!membership || membership.deletedAt || membership.user.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND);
    }

    const deletedAt = new Date();
    await this.membershipRepository.softDeleteByUserAndOrganization(
      input.id,
      input.organizationId,
      deletedAt,
    );

    this.logger.log('[SoftDeleteUserUseCase] Execute finished');

    return {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      deletedAt: deletedAt.toISOString(),
    };
  }
}
