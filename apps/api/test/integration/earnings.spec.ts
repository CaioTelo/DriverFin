import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { configureApplication } from '../../src/application.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createTestPrisma, requireTestDatabaseUrl } from './test-database.js';

describe('ganhos', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const headers = {
    Origin: 'http://localhost:3000',
    'X-DriverFin-Client': 'web',
    'Content-Type': 'application/json',
  };
  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    process.env.NODE_ENV = 'test';
    process.env.WEB_ORIGIN = headers.Origin;
    process.env.JWT_ACCESS_SECRET = 'integration-secret-with-at-least-32-bytes';
    process.env.JWT_ISSUER = 'driverfin-api';
    process.env.JWT_AUDIENCE = 'driverfin-web';
    const { AppModule } = await import('../../src/app.module.js');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
    prisma = createTestPrisma();
  });
  afterAll(async () => {
    await app.close();
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
  async function account(email: string) {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .set(headers)
      .send({ name: email, email, password: 'senha ganhos' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send({ email, password: 'senha ganhos' })
      .expect(200);
    return `Bearer ${login.body.accessToken}`;
  }
  const valid = {
    date: '2026-09-08',
    platformId: 'UBER',
    amount: '300.00',
    rides: 12,
    hours: '6.00',
    kilometers: '100.00',
  };

  it('cadastra sem veículo, preserva zeros e registros iguais, lista e consulta com valores exatos', async () => {
    const authorization = await account('earning-create@example.com');
    const catalog = await request(app.getHttpServer())
      .get('/api/platforms')
      .set('Authorization', authorization)
      .expect(200);
    expect(catalog.body.items.map((item: { id: string }) => item.id)).toEqual([
      'UBER',
      'NINETY_NINE',
      'INDRIVE',
      'PRIVATE',
      'OTHER',
    ]);
    const first = await request(app.getHttpServer())
      .post('/api/earnings')
      .set(headers)
      .set('Authorization', authorization)
      .send({ ...valid, rides: 0, hours: '0', kilometers: '0.00' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/earnings')
      .set(headers)
      .set('Authorization', authorization)
      .send(valid)
      .expect(201);
    const list = await request(app.getHttpServer())
      .get('/api/earnings?page=1')
      .set('Authorization', authorization)
      .expect(200);
    expect(list.body).toMatchObject({ page: 1, pageSize: 20, total: 2 });
    expect(list.body.items[1]).toMatchObject({
      id: first.body.id,
      amount: '300.00',
      rides: 0,
      hours: '0.00',
      kilometers: '0.00',
      platform: { id: 'UBER', name: 'Uber' },
    });
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/earnings/${first.body.id}`)
          .set('Authorization', authorization)
          .expect(200)
      ).body.userId,
    ).toBeUndefined();
  });

  it.each([
    [{ amount: '0' }, 'amount'],
    [{ amount: '1.234' }, 'amount'],
    [{ rides: -1 }, 'rides'],
    [{ rides: 1.5 }, 'rides'],
    [{ hours: '24.01' }, 'hours'],
    [{ kilometers: '-1' }, 'kilometers'],
    [{ date: '2099-01-01' }, 'date'],
    [{ platformId: 'NOPE' }, 'platformId'],
    [{ userId: 'x' }, 'userId'],
  ])('rejeita entrada inválida %o', async (override, field) => {
    const authorization = await account(`earning-invalid-${field}-${Math.random()}@example.com`);
    const response = await request(app.getHttpServer())
      .post('/api/earnings')
      .set(headers)
      .set('Authorization', authorization)
      .send({ ...valid, ...override })
      .expect(400);
    expect(response.body.error.fields[field]).toBeDefined();
    expect(await prisma.earning.count()).toBe(0);
  });

  it('edita integralmente, exclui e não revela registro alheio/removido', async () => {
    const a = await account('earning-a@example.com');
    const b = await account('earning-b@example.com');
    const created = await request(app.getHttpServer())
      .post('/api/earnings')
      .set(headers)
      .set('Authorization', a)
      .send(valid)
      .expect(201);
    const replacement = {
      date: '2026-09-07',
      platformId: 'OTHER',
      amount: '10.50',
      rides: 0,
      hours: '24.00',
      kilometers: '0',
    };
    const updated = await request(app.getHttpServer())
      .put(`/api/earnings/${created.body.id}`)
      .set(headers)
      .set('Authorization', a)
      .send(replacement)
      .expect(200);
    expect(updated.body).toMatchObject({
      date: replacement.date,
      amount: '10.50',
      rides: 0,
      hours: '24.00',
      kilometers: '0.00',
    });
    await request(app.getHttpServer())
      .get(`/api/earnings/${created.body.id}`)
      .set('Authorization', b)
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/earnings/${created.body.id}`)
      .set(headers)
      .set('Authorization', a)
      .send({})
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/earnings/${created.body.id}`)
      .set(headers)
      .set('Authorization', a)
      .send({})
      .expect(404);
  });

  it('pagina 20 e revalida sessão sob lock antes da escrita', async () => {
    const authorization = await account('earning-page@example.com');
    const session = await prisma.authSession.findFirstOrThrow();
    const userId = session.userId;
    await prisma.earning.createMany({
      data: Array.from({ length: 21 }, (_, index) => ({
        userId,
        date: new Date('2026-09-01T00:00:00Z'),
        platformId: 'UBER',
        amount: String(index + 1),
        rides: 0,
        hours: '0',
        kilometers: '0',
      })),
    });
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/earnings?page=1')
          .set('Authorization', authorization)
          .expect(200)
      ).body.items,
    ).toHaveLength(20);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/earnings?page=2')
          .set('Authorization', authorization)
          .expect(200)
      ).body.items,
    ).toHaveLength(1);
    await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    await request(app.getHttpServer())
      .post('/api/earnings')
      .set(headers)
      .set('Authorization', authorization)
      .send(valid)
      .expect(401);
    expect(await prisma.earning.count()).toBe(21);
  });
});
