export enum ErrorMessagesEnum {
  EMAIL_ALREADY_REGISTERED = 'Email ja esta cadastrado',
  INVALID_EMAIL_OR_PASSWORD = 'Invalid email or password',
  // Uma mensagem para os quatro casos do passo 2 do login: nao e membro,
  // associacao desativada, usuario desativado, organizacao desativada.
  // Distinguir "a organizacao nao existe" de "voce nao e membro" revelaria
  // quais organizacoes existem a quem apenas tem uma credencial valida.
  ORGANIZATION_ACCESS_FORBIDDEN = 'Voce nao tem permissao para acessar esta organizacao',
  USER_NOT_FOUND = 'Usuario nao encontrado',
  FOLDER_NOT_FOUND = 'Pasta nao encontrada',
  FOLDER_NAME_ALREADY_REGISTERED = 'Ja existe uma pasta ativa com este nome para este usuario',
  FILE_NOT_FOUND = 'Arquivo nao encontrado',
  FILE_ACCESS_FORBIDDEN = 'Voce nao tem permissao para acessar este arquivo',
  FOLDER_ACCESS_FORBIDDEN = 'Voce nao tem permissao para acessar esta pasta',
  FILE_DOWNLOAD_TIMEOUT = 'Tempo limite excedido ao baixar arquivo',
  FILE_DOWNLOAD_UNAVAILABLE = 'Nao foi possivel realizar o download do arquivo',
  FOLDER_DOES_NOT_BELONG_TO_USER = 'A pasta informada nao pertence ao usuario',
  CANNOT_DELETE_DEFAULT_FOLDER = 'A pasta padrao do usuario nao pode ser excluida',
  AT_LEAST_ONE_FIELD_REQUIRED = 'Informe ao menos um campo para atualizacao',
  INVALID_FOLDER_LIST_FILTER = 'Informe apenas folderId ou rootsOnly',
  INVALID_CURRENT_PASSWORD = 'Senha atual invalida',
  PASSWORD_CONFIRMATION_DOES_NOT_MATCH = 'Confirmacao de nova senha nao confere',
  NEW_PASSWORD_MUST_BE_DIFFERENT = 'A nova senha deve ser diferente da senha atual',
  EXAM_NOT_FOUND = 'Exame nao encontrado',
  EXAM_CODE_ALREADY_REGISTERED = 'Ja existe um exame ativo com este codigo',
  EXAM_REQUEST_NOT_FOUND = 'Solicitacao de exame nao encontrada',
  CANNOT_DELETE_SELF = 'Voce nao pode excluir sua propria conta',
  UPLOAD_NOT_ALLOWED_IN_THIS_FOLDER = 'Upload nao permitido nesta pasta',
  FILE_TOO_LARGE = 'Arquivo excede o tamanho maximo permitido',
  FILE_TYPE_NOT_ALLOWED = 'Tipo de arquivo nao permitido',
  UPLOAD_FAILED = 'Nao foi possivel enviar o arquivo',
  // Usadas pelo PrismaExceptionFilter, quando uma constraint do banco e
  // violada apesar das guardas do use case. Genericas de proposito: o filtro
  // atua sobre qualquer tabela e nao sabe qual recurso falhou.
  RESOURCE_ALREADY_EXISTS = 'Ja existe um registro com estes dados',
  RESOURCE_NOT_FOUND = 'Registro nao encontrado',
}
