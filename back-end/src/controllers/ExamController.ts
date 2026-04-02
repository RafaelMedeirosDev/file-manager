import { Body, Controller, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateExamDTO } from '../shared/dto/exam/CreateExamDTO';
import { CreateExamOutput, CreateExamUseCase } from '../usecases/exam/CreateExamUseCase';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamController {
  constructor(private readonly createExamUseCase: CreateExamUseCase) {}

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
