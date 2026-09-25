import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { configureApplication } from '../../src/application.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createTestPrisma, requireTestDatabaseUrl } from './test-database.js';

describe('dashboard', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const headers = {
    Origin: 'http://localhost:3000',
    'X-DriverFin-Client': 'web',
    'Content-Type': 'application/json',
  };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(),
  );

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
      .send({ name: email, email, password: 'senha dashboard' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send({ email, password: 'senha dashboard' })
      .expect(200);
    return `Bearer ${login.body.accessToken}`;
  }
  async function earning(auth: string, amount: string, overrides = {}) {
    return request(app.getHttpServer())
      .post('/api/earnings')
      .set(headers)
      .set('Authorization', auth)
      .send({
        date: today,
        platformId: 'UBER',
        amount,
        rides: 1,
        hours: '3.00',
        kilometers: '50.00',
        ...overrides,
      })
      .expect(201);
  }
  async function expense(auth: string, amount: string, overrides = {}) {
    return request(app.getHttpServer())
      .post('/api/expenses')
      .set(headers)
      .set('Authorization', auth)
      .send({ date: today, categoryId: 'FUEL', amount, ...overrides })
      .expect(201);
  }

  it('entrega os 12 componentes exatos, ordenados, isolados e limita recentes a cinco', async () => {
    const a = await account('dashboard-a@example.com');
    const b = await account('dashboard-b@example.com');
    await earning(a, '150.00');
    await earning(a, '150.00', { platformId: 'PRIVATE' });
    await expense(a, '70.00');
    await expense(a, '50.00', { categoryId: 'FOOD' });
    await expense(a, '1.00', { categoryId: 'TOLL' });
    await expense(a, '1.00', { categoryId: 'PARKING' });
    await earning(b, '999.00');
    await expense(b, '999.00');
    const response = await request(app.getHttpServer())
      .get('/api/dashboard?period=today')
      .set('Authorization', a)
      .expect(200);
    expect(response.body.period).toMatchObject({
      key: 'today',
      startDate: today,
      seriesEndDate: today,
      timezone: 'America/Sao_Paulo',
    });
    expect(response.body.totals).toEqual({
      revenue: '300.00',
      expenses: '122.00',
      profit: '178.00',
      hours: '6.00',
      kilometers: '100.00',
    });
    expect(response.body.indicators.revenuePerHour.value).toBe('50.00');
    expect(response.body.indicators.revenuePerKm.value).toBe('3.00');
    expect(response.body.revenueByPlatform.map((item: { id: string }) => item.id)).toEqual([
      'UBER',
      'PRIVATE',
    ]);
    expect(response.body.expensesByCategory.map((item: { id: string }) => item.id)).toEqual([
      'FUEL',
      'TOLL',
      'PARKING',
      'FOOD',
    ]);
    expect(response.body.evolution).toEqual([
      { date: today, revenue: '300.00', expenses: '122.00', profit: '178.00' },
    ]);
    expect(response.body.recentEntries).toHaveLength(5);
    expect(JSON.stringify(response.body)).not.toContain('999.00');
  });

  it('aplica filtros/default, dias vazios e reflete edição, data e exclusão', async () => {
    const auth = await account('dashboard-mutations@example.com');
    const createdEarning = await earning(auth, '300.00');
    const createdExpense = await expense(auth, '120.00');
    const initial = await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Authorization', auth)
      .expect(200);
    expect(initial.body.period.key).toBe('month');
    expect(initial.body.totals.profit).toBe('180.00');
    await request(app.getHttpServer())
      .put(`/api/earnings/${createdEarning.body.id}`)
      .set(headers)
      .set('Authorization', auth)
      .send({
        date: today,
        platformId: 'UBER',
        amount: '200.00',
        rides: 1,
        hours: '4.00',
        kilometers: '40.00',
      })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/expenses/${createdExpense.body.id}`)
      .set(headers)
      .set('Authorization', auth)
      .send({})
      .expect(204);
    const updated = await request(app.getHttpServer())
      .get('/api/dashboard?period=month')
      .set('Authorization', auth)
      .expect(200);
    expect(updated.body.totals).toMatchObject({
      revenue: '200.00',
      expenses: '0.00',
      profit: '200.00',
    });
    expect(updated.body.evolution.at(-1).date).toBe(today);
    expect(updated.body.evolution.some((item: { date: string }) => item.date > today)).toBe(false);
    expect(updated.body.indicators.margin.value).toBe('100.00');
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/dashboard?period=invalid')
          .set('Authorization', auth)
          .expect(400)
      ).body.error.fields.period,
    ).toBeDefined();
  });

  it('exclui fora do período, preserva prejuízo e representa denominadores zero', async () => {
    const auth = await account('dashboard-zero@example.com');
    await expense(auth, '50.00');
    const currentDate = new Date(`${today}T00:00:00.000Z`);
    const priorMonth = new Date(
      Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 1, 1),
    )
      .toISOString()
      .slice(0, 10);
    await earning(auth, '999.00', { date: priorMonth, hours: '1.00', kilometers: '1.00' });
    const current = await request(app.getHttpServer())
      .get('/api/dashboard?period=month')
      .set('Authorization', auth)
      .expect(200);
    expect(current.body.totals).toMatchObject({
      revenue: '0.00',
      expenses: '50.00',
      profit: '-50.00',
      hours: '0.00',
      kilometers: '0.00',
    });
    expect(current.body.indicators).toMatchObject({
      margin: { value: null, reason: 'NO_REVENUE' },
      revenuePerHour: { value: null, reason: 'NO_HOURS' },
      profitPerKm: { value: null, reason: 'NO_KILOMETERS' },
    });
    expect(JSON.stringify(current.body)).not.toContain('999.00');
    expect(
      current.body.evolution.some(
        (item: { revenue: string; expenses: string; profit: string }) =>
          item.revenue === '0.00' && item.expenses === '0.00' && item.profit === '0.00',
      ),
    ).toBe(true);
  });
});
