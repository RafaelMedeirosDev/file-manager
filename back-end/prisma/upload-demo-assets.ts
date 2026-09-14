import 'dotenv/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  canonicalMimeTypeFor,
  DEFAULT_UPLOAD_CONTENT_TYPE,
} from '../src/shared/constants/upload.constants';
import { DEMO_ASSETS, type DemoAsset } from './demo-assets';

/**
 * Sobe os objetos que a organizacao de demonstracao referencia.
 *
 * **Roda UMA vez, a mao.** O cron de reconstrucao nao chama este script e nao
 * recebe credencial de storage: ele so escreve no banco, e as linhas de
 * `files` apontam para estes objetos, que nunca sao apagados.
 *
 * Idempotente: `PutObject` sobrescreve a mesma key, entao rodar de novo apenas
 * regrava o mesmo conteudo.
 *
 * As credenciais vem direto do process.env, e nao de src/config/env.ts, pelo
 * mesmo motivo dos seeds: aquele modulo exige JWT_SECRET e derruba o import
 * por uma variavel que nada aqui usa.
 */

function createR2Client(): { client: S3Client; bucket: string } {
  const required = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
  ] as const;

  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
  });

  return { client, bucket: process.env.R2_BUCKET_NAME as string };
}

/**
 * Conteudo minimo e plausivel para cada asset.
 *
 * PDF escrito a mao em vez de biblioteca: sao poucos bytes, abrem em qualquer
 * leitor, e evitam uma dependencia nova para gerar arquivo de demonstracao.
 */
function bodyFor(asset: DemoAsset): Buffer {
  if (asset.extension === 'pdf') {
    const text = `${asset.title} -- documento de demonstracao`;
    const content = `BT /F1 12 Tf 48 720 Td (${text}) Tj ET`;
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
        '/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    ];

    return Buffer.from(
      `%PDF-1.4\n${objects.join('\n')}\ntrailer << /Root 1 0 R /Size 6 >>\n%%EOF\n`,
      'latin1',
    );
  }

  if (asset.extension === 'png') {
    // PNG 1x1 valido, em base64. Suficiente para o download entregar um
    // binario que o browser reconhece.
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP6zwAAAgUBAScrPmwAAAAASUVORK5CYII=',
      'base64',
    );
  }

  return Buffer.from(
    `${asset.title}\n\nDocumento de demonstracao do File Manager.\n`,
    'utf8',
  );
}

async function main(): Promise<void> {
  const { client, bucket } = createR2Client();

  for (const asset of DEMO_ASSETS) {
    const body = bodyFor(asset);
    // O mesmo criterio do UploadFileUseCase: o Content-Type e sempre o
    // canonico da extensao, nunca um valor informado de fora.
    const contentType =
      canonicalMimeTypeFor(asset.extension) ?? DEFAULT_UPLOAD_CONTENT_TYPE;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: asset.key,
        Body: body,
        ContentType: contentType,
      }),
    );

    console.log(`  ${asset.key}  ${contentType}  ${body.length} bytes`);
  }

  console.log(`\n${DEMO_ASSETS.length} objetos gravados em ${bucket}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
