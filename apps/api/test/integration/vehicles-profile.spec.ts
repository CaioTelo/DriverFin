import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { configureApplication } from '../../src/application.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createTestPrisma, requireTestDatabaseUrl } from './test-database.js';

describe('perfil e veículo', () => {
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
      .send({ name: `Nome ${email}`, email, password: 'senha veículo' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send({ email, password: 'senha veículo' })
      .expect(200);
    return {
      authorization: `Bearer ${login.body.accessToken}`,
      user: login.body.user as { id: string; email: string },
    };
  }
  const valid = { brand: ' Toyota ', model: ' Corolla ', year: 2026, fuel: 'FLEX' };

  it('consulta perfil mínimo, veículo nulo e catálogo ordenado', async () => {
    const a = await account('perfil@example.com');
    const profile = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', a.authorization)
      .expect(200);
    expect(profile.body).toEqual(expect.objectContaining({ id: a.user.id, email: a.user.email }));
    expect(profile.body.passwordHash).toBeUndefined();
    expect(profile.body.createdAt).toBeUndefined();
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/vehicles/me')
          .set('Authorization', a.authorization)
          .expect(200)
      ).body,
    ).toEqual({ vehicle: null });
    const fuels = await request(app.getHttpServer())
      .get('/api/vehicles/fuels')
      .set('Authorization', a.authorization)
      .expect(200);
    expect(fuels.body.items.map((item: { id: string }) => item.id)).toEqual([
      'GASOLINE',
      'ETHANOL',
      'FLEX',
      'DIESEL',
      'CNG',
      'ELECTRIC',
      'HYBRID',
      'OTHER',
    ]);
  });

  it('cadastra sem placa, normaliza textos e persiste apenas para o dono', async () => {
    const a = await account('veiculo-a@example.com');
    const b = await account('veiculo-b@example.com');
    const created = await request(app.getHttpServer())
      .post('/api/vehicles')
      .set(headers)
      .set('Authorization', a.authorization)
      .send(valid)
      .expect(201);
    expect(created.body).toMatchObject({
      brand: 'Toyota',
      model: 'Corolla',
      year: 2026,
      fuel: 'FLEX',
      plate: null,
    });
    expect(created.body.userId).toBeUndefined();
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/vehicles/me')
          .set('Authorization', a.authorization)
          .expect(200)
      ).body.vehicle.id,
    ).toBe(created.body.id);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/vehicles/me')
          .set('Authorization', b.authorization)
          .expect(200)
      ).body.vehicle,
    ).toBeNull();
  });

  it.each([
    [{ brand: ' ' }, 'brand'],
    [{ model: 'x'.repeat(101) }, 'model'],
    [{ year: 1899 }, 'year'],
    [{ year: 9999 }, 'year'],
    [{ fuel: 'WATER' }, 'fuel'],
    [{ plate: 'x'.repeat(11) }, 'plate'],
    [{ userId: 'a' }, 'userId'],
  ])('rejeita entrada inválida sem criar veículo: %o', async (override, field) => {
    const a = await account(`invalid-${field}-${Math.random()}@example.com`);
    const response = await request(app.getHttpServer())
      .post('/api/vehicles')
      .set(headers)
      .set('Authorization', a.authorization)
      .send({ ...valid, ...override })
      .expect(400);
    expect(response.body.error.fields[field]).toBeDefined();
    expect(await prisma.vehicle.count()).toBe(0);
  });

  it('aceita no máximo um cadastro inclusive em concorrência', async () => {
    const a = await account('concorrente@example.com');
    const results = await Promise.all([
      request(app.getHttpServer())
        .post('/api/vehicles')
        .set(headers)
        .set('Authorization', a.authorization)
        .send(valid),
      request(app.getHttpServer())
        .post('/api/vehicles')
        .set(headers)
        .set('Authorization', a.authorization)
        .send({ ...valid, brand: 'Honda' }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await prisma.vehicle.count()).toBe(1);
    await request(app.getHttpServer())
      .post('/api/vehicles')
      .set(headers)
      .set('Authorization', a.authorization)
      .send(valid)
      .expect(409);
  });

  it('nega sessão revogada antes de consultar ou criar', async () => {
    const a = await account('revogada-veiculo@example.com');
    await prisma.authSession.updateMany({ data: { revokedAt: new Date() } });
    await request(app.getHttpServer())
      .get('/api/vehicles/me')
      .set('Authorization', a.authorization)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/vehicles')
      .set(headers)
      .set('Authorization', a.authorization)
      .send(valid)
      .expect(401);
    expect(await prisma.vehicle.count()).toBe(0);
  });
});
