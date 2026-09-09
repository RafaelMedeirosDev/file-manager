import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import type { Response } from 'express';

/**
 * Traduz erros conhecidos do Prisma na resposta HTTP correspondente.
 *
 * Sem isto, uma violacao de constraint sobe ate o handler padrao do Nest e
 * chega ao cliente como 500 com corpo genérico. As guardas dos use cases
 * cobrem o caso comum, mas sao check-then-act: entre a consulta e o INSERT
 * existe uma janela em que outra requisicao pode gravar o mesmo valor. Quem
 * perde a corrida recebia 500 por um erro que e, na verdade, um conflito.
 *
 * Mapeia apenas o que tem equivalente claro em HTTP. Qualquer outro codigo do
 * Prisma continua caindo no comportamento padrao -- e melhor um 500 honesto do
 * que um status inventado.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const mapped = this.toHttpException(exception);

    if (!mapped) {
      throw exception;
    }

    // O codigo do Prisma nao vai para o cliente, mas fica no log: sem ele nao
    // ha como saber qual constraint falhou.
    this.logger.warn(
      `[PrismaExceptionFilter] ${exception.code} -> ${mapped.getStatus()}`,
    );

    response.status(mapped.getStatus()).json(mapped.getResponse());
  }

  private toHttpException(
    exception: Prisma.PrismaClientKnownRequestError,
  ): HttpException | null {
    switch (exception.code) {
      // Unique constraint violada.
      case 'P2002':
        return new ConflictException(ErrorMessagesEnum.RESOURCE_ALREADY_EXISTS);
      // Registro exigido pela operacao nao existe -- inclui o `connect` de uma
      // relacao cujo alvo desapareceu entre a validacao e a escrita.
      case 'P2025':
        return new NotFoundException(ErrorMessagesEnum.RESOURCE_NOT_FOUND);
      default:
        return null;
    }
  }
}
