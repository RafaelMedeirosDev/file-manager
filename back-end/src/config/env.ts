import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  DATABASE_SCHEMA: process.env.DATABASE_SCHEMA ?? 'projeto-kiko',
  JWT_SECRET: required('JWT_SECRET'),
  PORT: Number(process.env.PORT ?? 3000),
};
