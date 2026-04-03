import { Body, Controller, Post, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateExamRequestDTO } from '../shared/dto/exam-request/CreateExamRequestDTO';
import {
  CreateExamRequestOutput,
  CreateExamRequestUseCase,
} from '../usecases/exam-request/CreateExamRequestUseCase';

@Controller('exam-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamRequestController {
  constructor(private readonly createExamRequestUseCase: CreateExamRequestUseCase) {}

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
    return this.createExamRequestUseCase.execute({
      userId: req.user.sub,
      indication: body.indication,
      examIds: body.examIds,
    });
  }
}
