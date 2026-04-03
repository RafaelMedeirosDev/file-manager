import { Body, Controller, Get, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateExamDTO } from '../shared/dto/exam/CreateExamDTO';
import { ListExamsQueryDTO } from '../shared/dto/exam/ListExamsQueryDTO';
import { CreateExamOutput, CreateExamUseCase } from '../usecases/exam/CreateExamUseCase';
import { ListExamsOutput, ListExamsUseCase } from '../usecases/exam/ListExamsUseCase';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamController {
  constructor(
    private readonly createExamUseCase: CreateExamUseCase,
    private readonly listExamsUseCase: ListExamsUseCase,
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
  ): Promise<ListExamsOutput> {
    return this.listExamsUseCase.execute(query);
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
  ): Promise<CreateExamOutput> {
    return this.createExamUseCase.execute(body);
  }
}
