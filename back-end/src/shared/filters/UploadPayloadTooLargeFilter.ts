import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ErrorMessagesEnum } from '@file-manager/shared';

/**
 * Padroniza a resposta de estouro do limite de upload.
 *
 * O multer aborta a requisicao dentro do interceptor, antes do handler, e o
 * @nestjs/platform-express traduz LIMIT_FILE_SIZE para PayloadTooLargeException
 * com a mensagem inglesa 'File too large'. Este filtro reescreve o corpo para a
 * mensagem padronizada do ErrorMessagesEnum, preservando o status 413.
 *
 * Aplicado apenas nas rotas de upload via @UseFilters — nao e um filtro global.
 */
@Catch(PayloadTooLargeException)
export class UploadPayloadTooLargeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: ErrorMessagesEnum.FILE_TOO_LARGE,
      error: 'Payload Too Large',
    });
  }
}
