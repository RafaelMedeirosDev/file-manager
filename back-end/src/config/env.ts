import 'dotenv/config';
import type { LogLevel } from '@nestjs/common';

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

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  DATABASE_SCHEMA: process.env.DATABASE_SCHEMA ?? 'projeto-kiko',
  JWT_SECRET: required('JWT_SECRET'),
  PORT: Number(process.env.PORT ?? 3000),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  LOG_LEVELS: parseLogLevels(),
};
