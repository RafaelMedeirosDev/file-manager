/**
 * Extensoes aceitas em upload e o Content-Type canonico de cada uma.
 *
 * Esta lista e a fonte unica de verdade tanto para a whitelist de upload quanto
 * para o Content-Type devolvido no download. Formatos renderizados pelo browser
 * como documento ativo (svg, html, xhtml) ficam deliberadamente de fora.
 *
 * A restricao nasceu quando os objetos eram servidos publicamente e um arquivo
 * ativo permitiria XSS armazenado. Hoje o bucket e privado e o download sai da
 * API com Content-Disposition: attachment, mas a whitelist continua valendo
 * como defesa em profundidade.
 */
export const MIME_BY_EXTENSION: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  pdf: 'application/pdf',
  csv: 'text/csv',
  txt: 'text/plain',
  json: 'application/json',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export const DEFAULT_UPLOAD_CONTENT_TYPE = 'application/octet-stream';

export const BULK_UPLOAD_MAX_FILES = 20;

/**
 * Quantos arquivos do lote sao processados ao mesmo tempo.
 *
 * O limite existe pelo pool de conexoes, nao pelo R2: enviar os 20 de uma vez
 * disputa 20 conexoes de um pool de 10 e mantem todos os buffers residentes
 * (ate BULK_UPLOAD_MAX_FILES x MAX_UPLOAD_SIZE_BYTES).
 */
export const BULK_UPLOAD_CONCURRENCY = 4;

export const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Retorna o Content-Type canonico da extensao, ou null se ela nao for aceita.
 */
export function canonicalMimeTypeFor(extension: string): string | null {
  return MIME_BY_EXTENSION[extension.toLowerCase()] ?? null;
}

/**
 * Confere o mimetype declarado no multipart contra o canonico da extensao.
 *
 * O valor declarado pelo cliente nao e confiavel, mas uma divergencia explicita
 * (um .png anunciado como text/html) indica tentativa de burlar a whitelist.
 * `application/octet-stream` e aceito por ser o generico que varios clientes
 * enviam para formatos que nao reconhecem.
 */
export function declaredMimeTypeMatches(
  declaredMimeType: string,
  canonicalMimeType: string,
): boolean {
  const declared = declaredMimeType.split(';')[0].trim().toLowerCase();

  return (
    declared === canonicalMimeType ||
    declared === DEFAULT_UPLOAD_CONTENT_TYPE ||
    declared === ''
  );
}
