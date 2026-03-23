import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ROLE } from '@prisma/client';
import { CreateFileDTO } from '../shared/dto/file/CreateFileDTO';
import { ListFilesQueryDTO } from '../shared/dto/file/ListFilesQueryDTO';
import {
  UpdateFileDTO,
  UpdateFileParamsDTO,
} from '../shared/dto/file/UpdateFileDTO';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateFileOutput,
  CreateFileUseCase,
} from '../usecases/file/CreateFileUseCase';
import {
  GetFileByIdOutput,
  GetFileByIdUseCase,
} from '../usecases/file/GetFileByIdUseCase';
import {
  ListFilesOutput,
  ListFilesUseCase,
} from '../usecases/file/ListFilesUseCase';
import { DownloadFileUseCase } from '../usecases/file/DownloadFileUseCase';
import {
  SoftDeleteFileOutput,
  SoftDeleteFileUseCase,
} from '../usecases/file/SoftDeleteFileUseCase';
import {
  UpdateFileOutput,
  UpdateFileUseCase,
} from '../usecases/file/UpdateFileUseCase';
import type { JwtPayload } from '../auth/jwt.strategy';

@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FileController {
  constructor(
    private readonly createFileUseCase: CreateFileUseCase,
    private readonly listFilesUseCase: ListFilesUseCase,
    private readonly getFileByIdUseCase: GetFileByIdUseCase,
    private readonly downloadFileUseCase: DownloadFileUseCase,
    private readonly updateFileUseCase: UpdateFileUseCase,
    private readonly softDeleteFileUseCase: SoftDeleteFileUseCase,
  ) {}

  @Get()
  @Roles(ROLE.USER, ROLE.ADMIN)
  async findAll(
    @Req() req: Request & { user: JwtPayload },
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: ListFilesQueryDTO,
  ): Promise<ListFilesOutput> {
    return this.listFilesUseCase.execute({
      requesterUserId: req.user.sub,
      requesterRole: req.user.role,
      folderId: query.folderId,
    });
  }

  @Get(':id')
  @Roles(ROLE.USER, ROLE.ADMIN)
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<GetFileByIdOutput> {
    return this.getFileByIdUseCase.execute({
      id,
      requesterUserId: req.user.sub,
      requesterRole: req.user.role,
    });
  }

  @Get(':id/download')
  @Roles(ROLE.USER, ROLE.ADMIN)
  async download(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request & { user: JwtPayload },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.downloadFileUseCase.execute({
      id,
      requesterUserId: req.user.sub,
      requesterRole: req.user.role,
    });

    res.setHeader('Content-Type', file.contentType);

    if (file.contentLength) {
      res.setHeader('Content-Length', file.contentLength);
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );

    return new StreamableFile(file.stream);
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
    body: CreateFileDTO,
  ): Promise<CreateFileOutput> {
    return this.createFileUseCase.execute(body);
  }

  @Patch(':id')
  @Roles(ROLE.ADMIN)
  async updateFolder(
    @Param(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    params: UpdateFileParamsDTO,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: UpdateFileDTO,
  ): Promise<UpdateFileOutput> {
    return this.updateFileUseCase.execute({
      id: params.id,
      folderId: body.folderId,
      url: body.url,
    });
  }

  @Delete(':id')
  @Roles(ROLE.ADMIN)
  async softDelete(
    @Param(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    params: UpdateFileParamsDTO,
  ): Promise<SoftDeleteFileOutput> {
    return this.softDeleteFileUseCase.execute({
      id: params.id,
    });
  }
}
