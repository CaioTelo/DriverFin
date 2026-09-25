import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { configureApplication } from '../../src/application.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createTestPrisma, requireTestDatabaseUrl } from './test-database.js';
describe('despesas', () => {
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
      .send({ name: email, email, password: 'senha despesas' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send({ email, password: 'senha despesas' })
      .expect(200);
    return `Bearer ${login.body.accessToken}`;
  }
  const valid = { date: '2026-09-08', categoryId: 'FUEL', amount: '120.00' };
  it('cadastra sem veículo/descrição, lista, consulta e catálogo é ordenado', async () => {
    const auth = await account('expense-create@example.com');
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/expense-categories')
          .set('Authorization', auth)
          .expect(200)
      ).body.items,
    ).toHaveLength(9);
    const created = await request(app.getHttpServer())
      .post('/api/expenses')
      .set(headers)
      .set('Authorization', auth)
      .send({ ...valid, categoryId: 'OTHER', description: '   ' })
      .expect(201);
    expect(created.body).toMatchObject({
      amount: '120.00',
      description: null,
      category: { id: 'OTHER', name: 'Outros' },
    });
    const list = await request(app.getHttpServer())
      .get('/api/expenses')
      .set('Authorization', auth)
      .expect(200);
    expect(list.body).toMatchObject({ total: 1, pageSize: 20 });
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/expenses/${created.body.id}`)
          .set('Authorization', auth)
          .expect(200)
      ).body.userId,
    ).toBeUndefined();
  });
  it.each([
    [{ amount: '0' }, 'amount'],
    [{ amount: '1.234' }, 'amount'],
    [{ date: '2099-01-01' }, 'date'],
    [{ categoryId: 'NOPE' }, 'categoryId'],
    [{ description: 'x'.repeat(501) }, 'description'],
    [{ userId: 'x' }, 'userId'],
  ])('rejeita entrada inválida %o', async (override, field) => {
    const auth = await account(`expense-invalid-${field}-${Math.random()}@example.com`);
    const response = await request(app.getHttpServer())
      .post('/api/expenses')
      .set(headers)
      .set('Authorization', auth)
      .send({ ...valid, ...override })
      .expect(400);
    expect(response.body.error.fields[field]).toBeDefined();
    expect(await prisma.expense.count()).toBe(0);
  });
  it('substitui todos os campos, limpa descrição omitida, exclui e isola A/B', async () => {
    const a = await account('expense-a@example.com');
    const b = await account('expense-b@example.com');
    const created = await request(app.getHttpServer())
      .post('/api/expenses')
      .set(headers)
      .set('Authorization', a)
      .send({ ...valid, description: 'Inicial' })
      .expect(201);
    const updated = await request(app.getHttpServer())
      .put(`/api/expenses/${created.body.id}`)
      .set(headers)
      .set('Authorization', a)
      .send({ date: '2026-09-07', categoryId: 'FOOD', amount: '25.10' })
      .expect(200);
    expect(updated.body).toMatchObject({
      date: '2026-09-07',
      amount: '25.10',
      description: null,
      category: { id: 'FOOD' },
    });
    await request(app.getHttpServer())
      .get(`/api/expenses/${created.body.id}`)
      .set('Authorization', b)
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/expenses/${created.body.id}`)
      .set(headers)
      .set('Authorization', a)
      .send({})
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/expenses/${created.body.id}`)
      .set('Authorization', a)
      .expect(404);
  });
});
