import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createTestPrisma } from './test-database.js';

describe('migrations e constraints do banco', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrisma();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.passwordResetToken.deleteMany();
    await prisma.authSession.deleteMany();
    await prisma.earning.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.user.deleteMany();
  });

  async function createUser(email = 'motorista@example.com'): Promise<string> {
    const id = randomUUID();
    await prisma.user.create({
      data: { id, name: 'Motorista', email, passwordHash: 'hash-de-teste' },
    });
    return id;
  }

  it('aplica a migration e mantém os catálogos fixos em ordem', async () => {
    const [platforms, categories] = await Promise.all([
      prisma.platform.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.expenseCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);

    expect(platforms.map(({ id, sortOrder }) => [id, sortOrder])).toEqual([
      ['UBER', 1],
      ['NINETY_NINE', 2],
      ['INDRIVE', 3],
      ['PRIVATE', 4],
      ['OTHER', 5],
    ]);
    expect(categories).toHaveLength(9);
    expect(categories[0]).toMatchObject({ id: 'FUEL', sortOrder: 1 });
    expect(categories[8]).toMatchObject({ id: 'OTHER', sortOrder: 9 });
  });

  it('impõe e-mail canônico e unicidade após normalização', async () => {
    await createUser('unico@example.com');

    await expect(createUser('unico@example.com')).rejects.toMatchObject({ code: 'P2002' });
    await expect(createUser('UNICO@example.com')).rejects.toBeDefined();
  });

  it('impõe no máximo um veículo por usuário e a FK de proprietário', async () => {
    const userId = await createUser();
    const vehicle = {
      brand: 'Marca',
      model: 'Modelo',
      year: 2026,
      fuel: 'FLEX' as const,
    };

    await prisma.vehicle.create({ data: { id: randomUUID(), userId, ...vehicle } });
    await expect(
      prisma.vehicle.create({ data: { id: randomUUID(), userId, ...vehicle } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      prisma.vehicle.create({ data: { id: randomUUID(), userId: randomUUID(), ...vehicle } }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('rejeita CHECKs financeiros e temporais no PostgreSQL', async () => {
    const userId = await createUser();

    await expect(
      prisma.earning.create({
        data: {
          id: randomUUID(),
          userId,
          date: new Date('2026-09-24T00:00:00.000Z'),
          platformId: 'UBER',
          amount: '0',
          rides: 0,
          hours: '0',
          kilometers: '0',
        },
      }),
    ).rejects.toBeDefined();

    await expect(
      prisma.earning.create({
        data: {
          id: randomUUID(),
          userId,
          date: new Date('2026-09-24T00:00:00.000Z'),
          platformId: 'UBER',
          amount: '1',
          rides: 0,
          hours: '24.01',
          kilometers: '0',
        },
      }),
    ).rejects.toBeDefined();

    await expect(
      prisma.authSession.create({
        data: {
          id: randomUUID(),
          userId,
          refreshTokenHash: 'a'.repeat(64),
          createdAt: new Date('2026-09-24T12:00:00.000Z'),
          expiresAt: new Date('2026-09-24T12:00:00.000Z'),
        },
      }),
    ).rejects.toBeDefined();
  });
});
