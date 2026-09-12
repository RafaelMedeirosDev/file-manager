import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { ROLE } from '@prisma/client';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { CreateExamDTO } from '../shared/dto/exam/CreateExamDTO';
import { ListExamsQueryDTO } from '../shared/dto/exam/ListExamsQueryDTO';
import {
  CreateExamOutput,
  CreateExamUseCase,
} from '../usecases/exam/CreateExamUseCase';
import {
  ListExamsOutput,
  ListExamsUseCase,
} from '../usecases/exam/ListExamsUseCase';
import {
  SoftDeleteExamOutput,
  SoftDeleteExamUseCase,
} from '../usecases/exam/SoftDeleteExamUseCase';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('exams')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({
  description: 'Token ausente, invalido ou de usuario excluido',
})
@ApiForbiddenResponse({
  description: 'Papel do usuario nao autorizado para a rota',
})
@Controller('exams')
export class ExamController {
  constructor(
    private readonly createExamUseCase: CreateExamUseCase,
    private readonly listExamsUseCase: ListExamsUseCase,
    private readonly softDeleteExamUseCase: SoftDeleteExamUseCase,
  ) {}

  @Get()
  @Roles(ROLE.USER, ROLE.ADMIN)
  async list(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: ListExamsQueryDTO,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<ListExamsOutput> {
    return this.listExamsUseCase.execute({
      organizationId: req.user.organizationId,
      ...query,
    });
  }

  @Post()
  @Roles(ROLE.ADMIN)
  async create(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: CreateExamDTO,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<CreateExamOutput> {
    return this.createExamUseCase.execute({
      organizationId: req.user.organizationId,
      ...body,
    });
  }

  @Delete(':id')
  @Roles(ROLE.ADMIN)
  async softDelete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<SoftDeleteExamOutput> {
    return this.softDeleteExamUseCase.execute({
      organizationId: req.user.organizationId,
      id,
    });
  }
}
