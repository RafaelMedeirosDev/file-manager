import { Injectable } from '@nestjs/common';
import { Exam, ExamCategory } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ExamRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    organizationId: string;
    name: string;
    code: string;
    category: ExamCategory;
  }): Promise<Exam> {
    return this.prisma.exam.create({ data });
  }

  /**
   * Busca por codigo em TODAS as linhas, incluindo as soft-deletadas.
   *
   * A unique de `code` e composta com organization_id e nao tem recorte de
   * deletedAt, entao filtrar aqui criava divergencia: a guarda de
   * CreateExamUseCase nao via o registro excluido, o INSERT estourava a unique
   * e o cliente recebia 500 em vez de 409. Consultar tudo mantem aplicacao e
   * banco de acordo -- e o mesmo criterio que UserRepository.findByEmail usa
   * para o e-mail.
   *
   * O recorte por organizacao, esse sim, e obrigatorio: sem ele um codigo que
   * existe em outra organizacao devolveria 409, e a mensagem revelaria o
   * catalogo alheio.
   *
   * Efeito colateral aceito: um codigo soft-deletado nao pode ser reaproveitado.
   * Se um dia precisar ser, o caminho e um unique parcial
   * (`WHERE deleted_at IS NULL`) em SQL bruto, ciente de que o Prisma nao
   * expressa esse recorte e tentaria remove-lo a cada `migrate dev`.
   */
  findByCode(organizationId: string, code: string): Promise<Exam | null> {
    return this.prisma.exam.findFirst({
      where: { organizationId, code },
    });
  }

  listExamsActive(input: {
    organizationId: string;
    name?: string;
    code?: string;
    category?: ExamCategory;
    skip?: number;
    take?: number;
  }): Promise<Exam[]> {
    const { organizationId, name, code, category } = input;

    return this.prisma.exam.findMany({
      where: {
        // Incondicional, fora de qualquer spread.
        organizationId,
        deletedAt: null,
        ...(name
          ? {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(code
          ? {
              code: {
                contains: code,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(category
          ? {
              category: category,
            }
          : {}),
      },
      // Paginar sem ordenacao nao garante ordem estavel entre paginas: o
      // Postgres pode devolver a mesma linha duas vezes ou nenhuma conforme o
      // plano escolhido. Mesmo criterio das outras listagens do projeto.
      orderBy: { name: 'asc' },
      skip: input.skip,
      take: input.take,
    });
  }

  countExamsActive(input: {
    organizationId: string;
    name?: string;
    code?: string;
    category?: ExamCategory;
  }): Promise<number> {
    const { organizationId, name, code, category } = input;

    return this.prisma.exam.count({
      where: {
        organizationId,
        deletedAt: null,
        ...(name
          ? {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(code
          ? {
              code: {
                contains: code,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(category
          ? {
              category: category,
            }
          : {}),
      },
    });
  }

  /**
   * `findFirst`, e nao `findUnique`: e o que permite somar o predicado de
   * organizacao ao id.
   */
  findById(organizationId: string, id: string): Promise<Exam | null> {
    return this.prisma.exam.findFirst({ where: { id, organizationId } });
  }

  /**
   * Escrita por chave primaria: `update` exige `where` unique. A leitura que
   * precede esta escrita e a recortada (`findById`) -- ver a nota equivalente
   * em UserRepository.updateById.
   */
  softDeleteById(id: string, deletedAt: Date): Promise<Exam> {
    return this.prisma.exam.update({ where: { id }, data: { deletedAt } });
  }

  /**
   * Substituiu um `findManyBy(where: Prisma.ExamWhereInput)` que recebia o
   * `where` montado no use case -- o que vazava detalhe de Prisma para fora do
   * repositorio e, pior, tornava o escopo de organizacao invisivel: nao havia
   * onde acrescenta-lo sem confiar em dois chamadores lembrarem.
   *
   * **E o mecanismo que impede uma solicitacao de uma organizacao referenciar
   * exame de outra.** A relacao N-N `_ExamToExamRequest` e implicita, nao
   * aparece no schema e nao pode receber coluna de organizacao; a garantia e
   * write-time, e mora aqui. Os dois chamadores comparam
   * `exams.length !== ids.length` e transformam um id estrangeiro num 404
   * EXAM_NOT_FOUND limpo.
   */
  findActiveByIds(organizationId: string, ids: string[]): Promise<Exam[]> {
    return this.prisma.exam.findMany({
      where: { organizationId, id: { in: ids }, deletedAt: null },
    });
  }
}
