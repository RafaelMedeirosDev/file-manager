import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { ROLE } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CreateUserDTO } from '../shared/dto/user/CreateUserDTO';
import { ListUsersQueryDTO } from '../shared/dto/user/ListUsersQueryDTO';
import { UpdateUserBodyDTO } from '../shared/dto/user/UpdateUserBodyDTO';
import { UpdateUserParamsDTO } from '../shared/dto/user/UpdateUserParamsDTO';
import { ChangeOwnPasswordDTO } from '../shared/dto/user/ChangeOwnPasswordDTO';
import {
  CreateUserWithFoldersOutput,
  CreateUserWithFoldersUseCase,
} from '../usecases/user/CreateUserWithFoldersUseCase';
import {
  UpdateUserOutput,
  UpdateUserUseCase,
} from '../usecases/user/UpdateUserUseCase';
import {
  SoftDeleteUserOutput,
  SoftDeleteUserUseCase,
} from '../usecases/user/SoftDeleteUserUseCase';
import {
  ListUsersOutput,
  ListUsersUseCase,
} from '../usecases/user/ListUsersUseCase';
import {
  ChangeOwnPasswordOutput,
  ChangeOwnPasswordUseCase,
} from '../usecases/user/ChangeOwnPasswordUseCase';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({
  description: 'Token ausente, invalido ou de usuario excluido',
})
@ApiForbiddenResponse({
  description: 'Papel do usuario nao autorizado para a rota',
})
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE.ADMIN)
export class UserController {
  constructor(
    private readonly createUserWithFoldersUseCase: CreateUserWithFoldersUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly softDeleteUserUseCase: SoftDeleteUserUseCase,
    private readonly changeOwnPasswordUseCase: ChangeOwnPasswordUseCase,
  ) {}

  @Get()
  async findAll(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: ListUsersQueryDTO,
  ): Promise<ListUsersOutput> {
    return this.listUsersUseCase.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
  }

  @Post()
  async create(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: CreateUserDTO,
  ): Promise<CreateUserWithFoldersOutput> {
    return this.createUserWithFoldersUseCase.execute({
      name: body.name,
      email: body.email,
      password: body.password,
      folders: body.folders,
    });
  }

  @Roles(ROLE.USER, ROLE.ADMIN)
  @Patch('me/password')
  async changeOwnPassword(
    @Req() req: Request & { user: JwtPayload },
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: ChangeOwnPasswordDTO,
  ): Promise<ChangeOwnPasswordOutput> {
    return this.changeOwnPasswordUseCase.execute({
      userId: req.user.sub,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      confirmNewPassword: body.confirmNewPassword,
    });
  }

  @Patch(':id')
  async update(
    @Param(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    params: UpdateUserParamsDTO,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: UpdateUserBodyDTO,
  ): Promise<UpdateUserOutput> {
    return this.updateUserUseCase.execute({
      id: params.id,
      email: body.email,
      password: body.password,
    });
  }

  @Delete(':id')
  async softDelete(
    @Param(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    params: UpdateUserParamsDTO,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<SoftDeleteUserOutput> {
    return this.softDeleteUserUseCase.execute({
      id: params.id,
      requesterId: req.user.sub,
    });
  }
}
