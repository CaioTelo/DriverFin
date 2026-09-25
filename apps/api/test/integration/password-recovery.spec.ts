import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { configureApplication } from '../../src/application.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { PasswordMailer } from '../../src/auth/password-mailer.js';
import { createTestPrisma, requireTestDatabaseUrl } from './test-database.js';

class FakeMailer extends PasswordMailer {
  sent: Array<{ email: string; token: string }> = [];
  succeeds = true;
  async sendPasswordReset(email: string, token: string) {
    this.sent.push({ email, token });
    return this.succeeds;
  }
}

describe('recuperação de senha', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let mailer: FakeMailer;
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
    mailer = new FakeMailer();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PasswordMailer)
      .useValue(mailer)
      .compile();
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
    mailer.sent = [];
    mailer.succeeds = true;
    await prisma.passwordResetToken.deleteMany();
    await prisma.authSession.deleteMany();
    await prisma.earning.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.user.deleteMany();
  });

  async function register(email = 'recuperar@example.com', password = 'senha anterior') {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .set(headers)
      .send({ name: 'Recuperação', email, password })
      .expect(201);
  }
  function forgot(email = 'recuperar@example.com') {
    return request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .set(headers)
      .send({ email });
  }

  it('responde genericamente, guarda só hash e envia token após persistir', async () => {
    await register();
    const response = await forgot().expect(202);
    expect(response.body.message).toContain('Se houver uma conta');
    expect(mailer.sent).toHaveLength(1);
    const stored = await prisma.passwordResetToken.findFirstOrThrow();
    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.tokenHash).not.toBe(mailer.sent[0].token);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 60_000);
    await forgot('ausente@example.com').expect(202);
    expect(mailer.sent).toHaveLength(1);
  });

  it('revoga somente o token cujo envio falhou confirmadamente', async () => {
    await register();
    mailer.succeeds = false;
    await forgot().expect(202);
    const failed = await prisma.passwordResetToken.findFirstOrThrow();
    expect(failed.revokedAt).not.toBeNull();
    mailer.succeeds = true;
    await forgot().expect(202);
    const tokens = await prisma.passwordResetToken.findMany({ orderBy: { createdAt: 'asc' } });
    expect(tokens[0].revokedAt).not.toBeNull();
    expect(tokens[1].revokedAt).toBeNull();
  });

  it('senha inválida não consome token; reset troca senha e revoga sessões e links', async () => {
    await register();
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'recuperar@example.com', password: 'senha anterior' })
      .expect(200);
    await forgot().expect(202);
    const firstToken = mailer.sent[0].token;
    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .set(headers)
      .send({ token: firstToken, password: 'curta' })
      .expect(400);
    expect((await prisma.passwordResetToken.findFirstOrThrow()).usedAt).toBeNull();
    await forgot().expect(202);
    const secondToken = mailer.sent[1].token;
    const reset = await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .set(headers)
      .send({ token: secondToken, password: 'senha posterior' })
      .expect(204);
    expect(reset.headers['set-cookie'][0]).toContain('driverfin_refresh=;');
    await agent
      .get('/api/users/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'recuperar@example.com', password: 'senha anterior' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'recuperar@example.com', password: 'senha posterior' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .set(headers)
      .send({ token: firstToken, password: 'outra senha válida' })
      .expect(401);
  });

  it('rejeita token inválido, usado, revogado e expirado inclusive na igualdade', async () => {
    await register();
    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .set(headers)
      .send({ token: 'x'.repeat(43), password: 'senha posterior' })
      .expect(401);
    for (const state of ['used', 'revoked', 'expired'] as const) {
      await forgot().expect(202);
      const token = mailer.sent.at(-1)!.token;
      const row = await prisma.passwordResetToken.findFirstOrThrow({
        orderBy: { createdAt: 'desc' },
      });
      await prisma.passwordResetToken.update({
        where: { id: row.id },
        data:
          state === 'used'
            ? { usedAt: new Date() }
            : state === 'revoked'
              ? { revokedAt: new Date() }
              : { expiresAt: new Date() },
      });
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .set(headers)
        .send({ token, password: 'senha posterior' })
        .expect(401);
    }
  });

  it('permite no máximo um reset em duas requisições concorrentes', async () => {
    await register();
    await forgot().expect(202);
    const token = mailer.sent[0].token;
    const results = await Promise.all([
      request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .set(headers)
        .send({ token, password: 'senha concorrente a' }),
      request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .set(headers)
        .send({ token, password: 'senha concorrente b' }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([204, 401]);
  });
});
