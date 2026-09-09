import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FolderRepository } from '../../repositories/FolderRepository';
import { ErrorMessagesEnum } from '@file-manager/shared';

export type SoftDeleteFolderInput = {
  id: string;
};

export type SoftDeleteFolderOutput = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  deletedAt: string;
  deletedFoldersCount: number;
};

@Injectable()
export class SoftDeleteFolderUseCase {
  private readonly logger = new Logger(SoftDeleteFolderUseCase.name);
  constructor(private readonly folderRepository: FolderRepository) {}

  async execute(input: SoftDeleteFolderInput): Promise<SoftDeleteFolderOutput> {
    this.logger.log('[SoftDeleteFolderUseCase] Execute started');
    const existingFolder = await this.folderRepository.findById(input.id);

    if (!existingFolder || existingFolder.deletedAt) {
      throw new NotFoundException(ErrorMessagesEnum.FOLDER_NOT_FOUND);
    }

    // ── Guarda: a pasta padrao nao pode ser excluida ─────
    // Excluir a pasta padrao deixava o usuario num estado sem saida: ele perde
    // o upload (UploadFileUseCase exige folder.isDefault) e tambem a exclusao
    // dos proprios arquivos (SoftDeleteFileUseCase exige a mesma pasta viva).
    // Como nenhum DTO expoe isDefault, nao ha rota que devolva essa capacidade
    // -- nem para um ADMIN. Prevenir e a unica saida disponivel.
    if (existingFolder.isDefault) {
      throw new BadRequestException(
        ErrorMessagesEnum.CANNOT_DELETE_DEFAULT_FOLDER,
      );
    }

    const folderIds = await this.collectSubtreeIds(existingFolder.id);
    const deletedAt = new Date();

    await this.folderRepository.softDeleteSubtree(folderIds, deletedAt);
    this.logger.log('[SoftDeleteFolderUseCase] Execute finished');

    return {
      id: existingFolder.id,
      name: existingFolder.name,
      userId: existingFolder.userId,
      folderId: existingFolder.folderId,
      deletedAt: deletedAt.toISOString(),
      deletedFoldersCount: folderIds.length,
    };
  }

  /**
   * Percorre a subarvore em largura e devolve os ids da pasta e de todos os
   * descendentes ativos.
   *
   * O Set de visitados nao e zelo excessivo: a auto-relacao do schema nao tem
   * constraint contra ciclo, e uma hierarquia A -> B -> A manteria a travessia
   * consultando o banco indefinidamente. Mesmo cuidado que
   * GetFolderByIdUseCase aplica ao subir pelos ancestrais.
   */
  private async collectSubtreeIds(rootId: string): Promise<string[]> {
    const visitedFolderIds = new Set<string>([rootId]);
    const queue: string[] = [rootId];

    while (queue.length > 0) {
      const currentId = queue.shift() as string;
      const current = await this.folderRepository.findById(currentId);

      if (!current) {
        continue;
      }

      for (const child of current.children) {
        // Pasta ja excluida nao precisa ser revisitada nem remarcada.
        if (child.deletedAt || visitedFolderIds.has(child.id)) {
          continue;
        }

        visitedFolderIds.add(child.id);
        queue.push(child.id);
      }
    }

    return [...visitedFolderIds];
  }
}
