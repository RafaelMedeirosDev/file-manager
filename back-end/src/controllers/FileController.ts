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
  Res,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseFilters,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { env } from '../config/env';
import { BULK_UPLOAD_MAX_FILES } from '../shared/constants/upload.constants';
import { UploadPayloadTooLargeFilter } from '../shared/filters/UploadPayloadTooLargeFilter';
import type { Request, Response } from 'express';
import { ROLE } from '@prisma/client';
import { CreateFileDTO } from '../shared/dto/file/CreateFileDTO';
import { UploadFileDTO } from '../shared/dto/file/UploadFileDTO';
import { BulkUploadFilesDTO } from '../shared/dto/file/BulkUploadFilesDTO';
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
  UploadFileOutput,
  UploadFileUseCase,
} from '../usecases/file/UploadFileUseCase';
import {
  BulkUploadFilesOutput,
  BulkUploadFilesUseCase,
} from '../usecases/file/BulkUploadFilesUseCase';
import {
  SoftDeleteFileOutput,
  SoftDeleteFileUseCase,
} from '../usecases/file/SoftDeleteFileUseCase';
import {
  UpdateFileOutput,
  UpdateFileUseCase,
} from '../usecases/file/UpdateFileUseCase';
import type { JwtPayload } from '../auth/jwt.strategy';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('files')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({
  description: 'Token ausente, invalido ou de usuario excluido',
})
@ApiForbiddenResponse({
  description: 'Papel do usuario nao autorizado para a rota',
})
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
    private readonly uploadFileUseCase: UploadFileUseCase,
    private readonly bulkUploadFilesUseCase: BulkUploadFilesUseCase,
  ) {}

  @Post('upload')
  @Roles(ROLE.USER, ROLE.ADMIN)
  // O plugin nao infere multipart: o tipo Express.Multer.File vem de
  // node_modules e e descartado. Sem este schema a doc diria que a rota
  // recebe JSON -- errado, e justamente na rota mais interessante.
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'name', 'folderId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string', maxLength: 255 },
        folderId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: env.MAX_UPLOAD_SIZE_BYTES },
    }),
  )
  @UseFilters(UploadPayloadTooLargeFilter)
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: UploadFileDTO,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<UploadFileOutput> {
    const extension = file.originalname.split('.').pop()?.toLowerCase() ?? '';

    return this.uploadFileUseCase.execute({
      buffer: file.buffer,
      name: body.name,
      requesterId: req.user.sub,
      requesterRole: req.user.role,
      folderId: body.folderId,
      extension,
      mimeType: file.mimetype,
    });
  }

  @Post('bulk-upload')
  @Roles(ROLE.USER, ROLE.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files', 'folderId'],
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          maxItems: BULK_UPLOAD_MAX_FILES,
        },
        folderId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', BULK_UPLOAD_MAX_FILES, {
      limits: { fileSize: env.MAX_UPLOAD_SIZE_BYTES },
    }),
  )
  @UseFilters(UploadPayloadTooLargeFilter)
  async bulkUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: BulkUploadFilesDTO,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<BulkUploadFilesOutput> {
    return this.bulkUploadFilesUseCase.execute({
      files: files.map((f) => ({
        buffer: f.buffer,
        name: f.originalname.replace(/\.[^.]+$/, ''),
        extension: f.originalname.split('.').pop()?.toLowerCase() ?? '',
        mimeType: f.mimetype,
      })),
      folderId: body.folderId,
      requesterId: req.user.sub,
      requesterRole: req.user.role,
    });
  }

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
      page: query.page,
      limit: query.limit,
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
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({
    description:
      'Binario do arquivo, lido do bucket com as credenciais da aplicacao',
    schema: { type: 'string', format: 'binary' },
  })
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
    });
  }

  @Delete(':id')
  @Roles(ROLE.USER, ROLE.ADMIN)
  async softDelete(
    @Param(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    params: UpdateFileParamsDTO,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<SoftDeleteFileOutput> {
    return this.softDeleteFileUseCase.execute({
      id: params.id,
      requesterUserId: req.user.sub,
      requesterRole: req.user.role,
    });
  }
}
