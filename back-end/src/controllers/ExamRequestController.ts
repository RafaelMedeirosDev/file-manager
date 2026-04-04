import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateExamRequestDTO } from '../shared/dto/exam-request/CreateExamRequestDTO';
import { ExamRequestParamsDTO } from '../shared/dto/exam-request/ExamRequestParamsDTO';
import { ListExamRequestsQueryDTO } from '../shared/dto/exam-request/ListExamRequestsQueryDTO';
import { UpdateExamRequestDTO } from '../shared/dto/exam-request/UpdateExamRequestDTO';
import {
  CreateExamRequestOutput,
  CreateExamRequestUseCase,
} from '../usecases/exam-request/CreateExamRequestUseCase';
import {
  GetExamRequestByIdOutput,
  GetExamRequestByIdUseCase,
} from '../usecases/exam-request/GetExamRequestByIdUseCase';
import {
  ListExamRequestsOutput,
  ListExamRequestsUseCase,
} from '../usecases/exam-request/ListExamRequestsUseCase';
import {
  UpdateExamRequestOutput,
  UpdateExamRequestUseCase,
} from '../usecases/exam-request/UpdateExamRequestUseCase';

@Controller('exam-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamRequestController {
  constructor(
    private readonly createExamRequestUseCase: CreateExamRequestUseCase,
    private readonly listExamRequestsUseCase: ListExamRequestsUseCase,
    private readonly getExamRequestByIdUseCase: GetExamRequestByIdUseCase,
    private readonly updateExamRequestUseCase: UpdateExamRequestUseCase,
  ) {}

  @Get()
  @Roles(ROLE.ADMIN)
  async list(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: ListExamRequestsQueryDTO,
  ): Promise<ListExamRequestsOutput> {
    return this.listExamRequestsUseCase.execute({
      page: query.page,
      limit: query.limit,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      userId: query.userId,
      examIds: query.examIds,
    });
  }

  @Get(':id')
  @Roles(ROLE.ADMIN)
  async getById(
    @Param(new ValidationPipe({ transform: true, whitelist: true }))
    params: ExamRequestParamsDTO,
  ): Promise<GetExamRequestByIdOutput> {
    return this.getExamRequestByIdUseCase.execute({ id: params.id });
  }

  @Patch(':id')
  @Roles(ROLE.ADMIN)
  async update(
    @Param(new ValidationPipe({ transform: true, whitelist: true }))
    params: ExamRequestParamsDTO,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    body: UpdateExamRequestDTO,
  ): Promise<UpdateExamRequestOutput> {
    return this.updateExamRequestUseCase.execute({
      id: params.id,
      indication: body.indication,
      examIds: body.examIds,
    });
  }

  @Post()
  @Roles(ROLE.USER, ROLE.ADMIN)
  async create(
    @Req() req: Request & { user: JwtPayload },
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: CreateExamRequestDTO,
  ): Promise<CreateExamRequestOutput> {
    const effectiveUserId =
      body.targetUserId && req.user.role === ROLE.ADMIN
        ? body.targetUserId
        : req.user.sub;

    return this.createExamRequestUseCase.execute({
      userId: effectiveUserId,
      indication: body.indication,
      examIds: body.examIds,
    });
  }
}
