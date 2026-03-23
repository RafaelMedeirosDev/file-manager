import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CreateFolderDTO } from '../shared/dto/folder/CreateFolderDTO';
import { ListFoldersQueryDTO } from '../shared/dto/folder/ListFoldersQueryDTO';
import { UpdateFolderBodyDTO } from '../shared/dto/folder/UpdateFolderBodyDTO';
import { UpdateFolderParamsDTO } from '../shared/dto/folder/UpdateFolderParamsDTO';
import {
  CreateFolderOutput,
  CreateFolderUseCase,
} from '../usecases/folder/CreateFolderUseCase';
import {
  GetFolderByIdOutput,
  GetFolderByIdUseCase,
} from '../usecases/folder/GetFolderByIdUseCase';
import {
  ListFoldersOutput,
  ListFoldersUseCase,
} from '../usecases/folder/ListFoldersUseCase';
import {
  SoftDeleteFolderOutput,
  SoftDeleteFolderUseCase,
} from '../usecases/folder/SoftDeleteFolderUseCase';
import {
  UpdateFolderOutput,
  UpdateFolderUseCase,
} from '../usecases/folder/UpdateFolderUseCase';
import type { JwtPayload } from '../auth/jwt.strategy';

@Controller('folders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FolderController {
  constructor(
    private readonly createFolderUseCase: CreateFolderUseCase,
    private readonly listFoldersUseCase: ListFoldersUseCase,
    private readonly getFolderByIdUseCase: GetFolderByIdUseCase,
    private readonly updateFolderUseCase: UpdateFolderUseCase,
    private readonly softDeleteFolderUseCase: SoftDeleteFolderUseCase,
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
    query: ListFoldersQueryDTO,
  ): Promise<ListFoldersOutput> {
    return this.listFoldersUseCase.execute({
      requesterUserId: req.user.sub,
      requesterRole: req.user.role,
      folderId: query.folderId,
      rootsOnly: query.rootsOnly,
    });
  }

  @Get(':id')
  @Roles(ROLE.USER, ROLE.ADMIN)
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<GetFolderByIdOutput> {
    return this.getFolderByIdUseCase.execute({
      id,
      requesterUserId: req.user.sub,
      requesterRole: req.user.role,
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
    body: CreateFolderDTO,
  ): Promise<CreateFolderOutput> {
    return this.createFolderUseCase.execute(body);
  }

  @Patch(':id')
  @Roles(ROLE.ADMIN)
  async update(
    @Param(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    params: UpdateFolderParamsDTO,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: UpdateFolderBodyDTO,
  ): Promise<UpdateFolderOutput> {
    return this.updateFolderUseCase.execute({
      id: params.id,
      name: body.name,
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
    params: UpdateFolderParamsDTO,
  ): Promise<SoftDeleteFolderOutput> {
    return this.softDeleteFolderUseCase.execute({
      id: params.id,
    });
  }
}
