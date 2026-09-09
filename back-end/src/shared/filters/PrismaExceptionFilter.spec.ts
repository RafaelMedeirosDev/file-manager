import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorMessagesEnum } from '@file-manager/shared';
import { PrismaExceptionFilter } from './PrismaExceptionFilter';

function knownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('boom', {
    code,
    clientVersion: 'test',
  });
}

/** Host mínimo com o par status/json que o filtro usa. */
function hostMock() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
    jest.clearAllMocks();
  });

  describe('should map known Prisma errors to their HTTP equivalent', () => {
    it('turns a unique constraint violation into 409', () => {
      const { host, status, json } = hostMock();

      // É o erro que uma corrida entre duas criações produz: as duas passam
      // pela guarda do use case e o banco rejeita a segunda.
      filter.catch(knownError('P2002'), host);

      expect(status).toHaveBeenCalledWith(409);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: ErrorMessagesEnum.RESOURCE_ALREADY_EXISTS,
        }),
      );
    });

    it('turns a missing required record into 404', () => {
      const { host, status, json } = hostMock();

      filter.catch(knownError('P2025'), host);

      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: ErrorMessagesEnum.RESOURCE_NOT_FOUND,
        }),
      );
    });
  });

  describe('should not invent a status for what it does not know', () => {
    it('rethrows an unmapped Prisma code instead of guessing', () => {
      const { host, status } = hostMock();
      const unmapped = knownError('P2034');

      // Melhor um 500 honesto do que traduzir errado: o erro segue para o
      // handler padrão do Nest.
      expect(() => filter.catch(unmapped, host)).toThrow(unmapped);
      expect(status).not.toHaveBeenCalled();
    });
  });
});
