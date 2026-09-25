import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { configureApplication } from '../../src/application.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createTestPrisma, requireTestDatabaseUrl } from './test-database.js';

describe('cadastro e login', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const jwtSecret = 'integration-secret-with-at-least-32-bytes';
  const headers = {
    Origin: 'http://localhost:3000',
    'X-DriverFin-Client': 'web',
    'Content-Type': 'application/json',
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    process.env.NODE_ENV = 'test';
    process.env.WEB_ORIGIN = headers.Origin;
    process.env.JWT_ACCESS_SECRET = jwtSecret;
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

  function register(overrides: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .set(headers)
      .send({
        name: '  Motorista Teste  ',
        email: ' Motorista@Example.com ',
        password: 'senha segura',
        ...overrides,
      });
  }

  it('cadastra normalizado, preserva a senha e não cria sessão', async () => {
    const response = await register().expect(201);
    expect(response.body.user).toMatchObject({
      name: 'Motorista Teste',
      email: 'motorista@example.com',
    });
    expect(response.body.user.passwordHash).toBeUndefined();

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'motorista@example.com' } });
    expect(user.passwordHash).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
    expect(await prisma.authSession.count()).toBe(0);
  });

  it.each([
    [{ email: 'invalido' }, 'email'],
    [{ password: 'curta' }, 'password'],
    [{ name: '   ' }, 'name'],
  ])('rejeita cadastro inválido sem criar conta: %o', async (overrides, field) => {
    const response = await register(overrides).expect(400);
    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      writeOutcome: 'not_applied',
    });
    expect(response.body.error.fields[field]).toBeDefined();
    expect(await prisma.user.count()).toBe(0);
  });

  it('aceita senha com espaços e senha de 128 caracteres sem trim', async () => {
    await register({ email: 'espacos@example.com', password: '  abcdef  ' }).expect(201);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'espacos@example.com', password: '  abcdef  ' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'espacos@example.com', password: 'abcdef' })
      .expect(401);

    const longPassword = 'x'.repeat(128);
    await register({ email: 'longa@example.com', password: longPassword }).expect(201);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'longa@example.com', password: longPassword })
      .expect(200);
  });

  it('trata duplicidade sem diferenciar caixa e corrida de cadastro', async () => {
    await register({ email: 'unico@example.com' }).expect(201);
    await register({ email: ' UNICO@EXAMPLE.COM ' }).expect(409);

    await prisma.authSession.deleteMany();
    await prisma.user.deleteMany();
    const results = await Promise.all([
      register({ email: 'corrida@example.com' }),
      register({ email: 'CORRIDA@example.com' }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await prisma.user.count()).toBe(1);
  });

  it('faz login e persiste somente hash do refresh com expiração absoluta', async () => {
    await register({ email: 'login@example.com', password: 'senha login' }).expect(201);
    const before = Date.now();
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send({ email: ' LOGIN@example.com ', password: 'senha login' })
      .expect(200);

    expect(response.body).toMatchObject({ expiresIn: 900, user: { email: 'login@example.com' } });
    const cookie = response.headers['set-cookie'][0] as string;
    expect(cookie).toContain('driverfin_refresh=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/api/auth');
    expect(cookie).toContain('SameSite=Lax');

    const session = await prisma.authSession.findFirstOrThrow();
    expect(session.refreshTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(cookie).not.toContain(session.refreshTokenHash);
    expect(session.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 604_799_000);
    expect(session.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 604_801_000);

    const payload = new JwtService({ secret: jwtSecret }).verify(response.body.accessToken, {
      algorithms: ['HS256'],
      issuer: 'driverfin-api',
      audience: 'driverfin-web',
    }) as Record<string, unknown>;
    expect(payload).toMatchObject({ sub: response.body.user.id, sid: session.id });
    expect(Number(payload.exp) - Number(payload.iat)).toBe(900);
  });

  it.each([
    { email: 'ausente@example.com', password: 'senha qualquer' },
    { email: 'existente@example.com', password: 'senha errada' },
    { email: 'formato-invalido', password: 'senha errada' },
  ])('retorna erro genérico sem enumerar credencial para %o', async (credentials) => {
    await register({ email: 'existente@example.com', password: 'senha correta' }).expect(201);
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send(credentials)
      .expect(401);
    expect(response.body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'E-mail ou senha inválidos.',
      writeOutcome: 'not_applied',
    });
    expect(response.body.error.fields).toBeUndefined();
  });

  it('renova sem rotacionar cookie ou validade e consulta somente o próprio perfil', async () => {
    await register({ email: 'a@example.com', password: 'senha conta a' }).expect(201);
    await register({ email: 'b@example.com', password: 'senha conta b' }).expect(201);
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'a@example.com', password: 'senha conta a' })
      .expect(200);
    const sessionBefore = await prisma.authSession.findFirstOrThrow({
      where: { userId: login.body.user.id },
    });

    const refreshed = await agent.post('/api/auth/refresh').set(headers).send({}).expect(200);
    expect(refreshed.headers['set-cookie']).toBeUndefined();
    expect(refreshed.body.user).toMatchObject({ email: 'a@example.com' });
    const sessionAfter = await prisma.authSession.findUniqueOrThrow({
      where: { id: sessionBefore.id },
    });
    expect(sessionAfter.expiresAt).toEqual(sessionBefore.expiresAt);

    const me = await agent
      .get('/api/users/me')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      .expect(200);
    expect(me.body).toEqual(login.body.user);
    expect(me.body.passwordHash).toBeUndefined();
  });

  it('recusa refresh ausente, inválido, expirado e revogado', async () => {
    await request(app.getHttpServer()).post('/api/auth/refresh').set(headers).send({}).expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set(headers)
      .set('Cookie', 'driverfin_refresh=invalido')
      .send({})
      .expect(401);

    await register({ email: 'refresh@example.com', password: 'senha refresh' }).expect(201);
    const first = request.agent(app.getHttpServer());
    await first
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'refresh@example.com', password: 'senha refresh' })
      .expect(200);
    const session = await prisma.authSession.findFirstOrThrow();
    await prisma.authSession.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    await first.post('/api/auth/refresh').set(headers).send({}).expect(401);

    await prisma.authSession.deleteMany();
    const second = request.agent(app.getHttpServer());
    await second
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'refresh@example.com', password: 'senha refresh' })
      .expect(200);
    const active = await prisma.authSession.findFirstOrThrow();
    await prisma.authSession.update({ where: { id: active.id }, data: { revokedAt: new Date() } });
    await second.post('/api/auth/refresh').set(headers).send({}).expect(401);
  });

  it('logout é idempotente, revoga no servidor e invalida JWT ainda não expirado', async () => {
    await register({ email: 'logout@example.com', password: 'senha logout' }).expect(201);
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'logout@example.com', password: 'senha logout' })
      .expect(200);
    await agent
      .get('/api/users/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    const logout = await agent.post('/api/auth/logout').set(headers).send({}).expect(204);
    expect(logout.headers['set-cookie'][0]).toContain('driverfin_refresh=;');
    await agent
      .get('/api/users/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(401);
    await agent
      .post('/api/auth/logout')
      .set(headers)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({})
      .expect(204);
  });

  it('mantém sessões independentes e aceita logout com access expirado via refresh', async () => {
    await register({ email: 'sessoes@example.com', password: 'senha sessoes' }).expect(201);
    const first = request.agent(app.getHttpServer());
    const second = request.agent(app.getHttpServer());
    const firstLogin = await first
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'sessoes@example.com', password: 'senha sessoes' })
      .expect(200);
    const secondLogin = await second
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'sessoes@example.com', password: 'senha sessoes' })
      .expect(200);
    await first.post('/api/auth/logout').set(headers).send({}).expect(204);
    await first
      .get('/api/users/me')
      .set('Authorization', `Bearer ${firstLogin.body.accessToken}`)
      .expect(401);
    await second
      .get('/api/users/me')
      .set('Authorization', `Bearer ${secondLogin.body.accessToken}`)
      .expect(200);
  });
});
