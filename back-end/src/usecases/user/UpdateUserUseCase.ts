import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { hash } from 'bcrypt';
import { UserRepository } from '../../repositories/UserRepository';
import { MembershipRepository } from '../../repositories/MembershipRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { BCRYPT_SALT_ROUNDS } from '../../shared/constants/bcrypt.constants';

export type UpdateUserInput = {
  organizationId: string;
  id: string;
  name?: string;
  email?: string;
  password?: string;
};

export type UpdateUserOutput = {
  id: string;
  name: string;
  email: string;
  role: ROLE;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UpdateUserUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: UpdateUserInput): Promise<UpdateUserOutput> {
    this.logger.log('[UpdateUserUseCase] Execute started');

    // Esta guarda precisa crescer junto com o input. Um campo novo esquecido
    // aqui faz um PATCH que so o envia responder 400 -- e a falha aparece em
    // uso real, nao nos testes dos outros campos.
    if (!input.name && !input.email && !input.password) {
      throw new BadRequestException(
        ErrorMessagesEnum.AT_LEAST_ONE_FIELD_REQUIRED,
      );
    }

    // A associacao serve a dois propositos numa consulta so: e a guarda de
    // existencia recortada por organizacao, e e de onde sai o papel exibido.
    // Mesmo metodo que SoftDeleteUserUseCase usa.
    const membership =
      await this.membershipRepository.findByUserAndOrganization(
        input.id,
        input.organizationId,
      );

    if (!membership || membership.deletedAt || membership.user.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.USER_NOT_FOUND);
    }

    if (input.email) {
      const userWithSameEmail = await this.userRepository.findByEmail(
        input.email,
      );

      if (userWithSameEmail && userWithSameEmail.id !== input.id) {
        throw new ConflictException(ErrorMessagesEnum.EMAIL_ALREADY_REGISTERED);
      }
    }

    const hashedPassword = input.password
      ? await hash(input.password, BCRYPT_SALT_ROUNDS)
      : undefined;

    const updatedUser = await this.userRepository.updateById(input.id, {
      name: input.name,
      email: input.email,
      password: hashedPassword,
    });

    this.logger.log('[UpdateUserUseCase] Execute finished');

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      // Da associacao, e nao de `users.role` -- que e legado esperando o
      // DROP COLUMN do contract.
      //
      // Este use case NAO edita papel, e isso e decisao, nao lacuna. Promover
      // ou rebaixar alguem exige tres coisas que o projeto nao tem: guarda de
      // auto-rebaixamento, guarda de ultimo ADMIN da organizacao, e um metodo
      // no MembershipRepository que escreva `role` -- porque o papel vive na
      // associacao, nao no usuario. Fica como trabalho proprio.
      role: membership.role,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }
}
