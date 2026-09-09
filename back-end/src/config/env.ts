import 'dotenv/config';
import type { LogLevel } from '@nestjs/common';
import { DEFAULT_MAX_UPLOAD_SIZE_BYTES } from '../shared/constants/upload.constants';

const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';

function required(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function parseLogLevels(): LogLevel[] {
  const value = process.env.LOG_LEVELS?.trim();

  if (!value) {
    return ['log', 'error', 'warn'];
  }

  const allowed = new Set<LogLevel>([
    'log',
    'error',
    'warn',
    'debug',
    'verbose',
    'fatal',
  ]);

  const levels = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is LogLevel => allowed.has(item as LogLevel));

  return levels.length > 0 ? levels : ['log', 'error', 'warn'];
}

function parseCorsOrigins(): string[] {
  const value = process.env.CORS_ORIGINS?.trim();

  // Opcional de proposito. `required()` aqui derrubaria o CI inteiro: env.ts
  // valida no momento do import e os specs importam este modulo, entao a suite
  // nem carregaria sem a variavel definida no workflow.
  //
  // O default cobre o desenvolvimento, onde o front (5173) ja chama a API
  // (3000) cross-origin. Em producao a variavel precisa listar o dominio do
  // front, senao a API rejeita as chamadas dele.
  if (!value) {
    return [DEFAULT_CORS_ORIGIN];
  }

  // A barra final e removida porque o header Origin nunca a envia e a
  // comparacao do CORS e literal: `https://app.com/` configurado aqui nunca
  // casaria com `https://app.com` vindo do browser, e o sintoma (requisicao
  // bloqueada) nao aponta para a causa.
  const origins = value
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return origins.length > 0 ? origins : [DEFAULT_CORS_ORIGIN];
}

function parseMaxUploadSizeBytes(): number {
  const value = process.env.MAX_UPLOAD_SIZE_BYTES?.trim();

  if (!value) {
    return DEFAULT_MAX_UPLOAD_SIZE_BYTES;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_MAX_UPLOAD_SIZE_BYTES;
  }

  return parsed;
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  DATABASE_SCHEMA: process.env.DATABASE_SCHEMA,
  JWT_SECRET: required('JWT_SECRET'),
  PORT: Number(process.env.PORT ?? 3000),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  LOG_LEVELS: parseLogLevels(),
  MAX_UPLOAD_SIZE_BYTES: parseMaxUploadSizeBytes(),
  CORS_ORIGINS: parseCorsOrigins(),

  R2_ACCOUNT_ID: required('R2_ACCOUNT_ID'),
  R2_ACCESS_KEY_ID: required('R2_ACCESS_KEY_ID'),
  R2_SECRET_ACCESS_KEY: required('R2_SECRET_ACCESS_KEY'),
  R2_BUCKET_NAME: required('R2_BUCKET_NAME'),
  R2_PUBLIC_URL: required('R2_PUBLIC_URL'),
};
