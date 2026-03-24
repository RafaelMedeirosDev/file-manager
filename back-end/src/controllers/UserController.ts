import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDTO } from '../shared/dto/user/CreateUserDTO';
import { ListUsersQueryDTO } from '../shared/dto/user/ListUsersQueryDTO';
import { UpdateUserBodyDTO } from '../shared/dto/user/UpdateUserBodyDTO';
import { UpdateUserParamsDTO } from '../shared/dto/user/UpdateUserParamsDTO';
import {
  CreateUserOutput,
  CreateUserUseCase,
} from '../usecases/user/CreateUserUseCase';
import {
  UpdateUserOutput,
  UpdateUserUseCase,
} from '../usecases/user/UpdateUserUseCase';
import {
  SoftDeleteUserOutput,
  SoftDeleteUserUseCase,
} from '../usecases/user/SoftDeleteUserUseCase';
import { ListUsersOutput, ListUsersUseCase } from '../usecases/user/ListUsersUseCase';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE.ADMIN)
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly softDeleteUserUseCase: SoftDeleteUserUseCase,
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
  ): Promise<CreateUserOutput> {
    return this.createUserUseCase.execute(body);
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
  ): Promise<SoftDeleteUserOutput> {
    return this.softDeleteUserUseCase.execute({
      id: params.id,
    });
  }
}
