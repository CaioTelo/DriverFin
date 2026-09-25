import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';

export function requireTestDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) {
    throw new Error('TEST_DATABASE_URL é obrigatória para testes de integração.');
  }

  const url = new URL(value);
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (databaseName !== 'driverfin_test') {
    throw new Error('Testes recusados: TEST_DATABASE_URL deve usar o banco driverfin_test.');
  }

  return value;
}

export function createTestPrisma(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireTestDatabaseUrl() }),
    log: [],
  });
}
