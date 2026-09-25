import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { configureApplication } from '../../src/application.js';
import { AuthConcurrencyProbe } from '../../src/auth/auth-concurrency-probe.js';
import { PasswordMailer } from '../../src/auth/password-mailer.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createTestPrisma, requireTestDatabaseUrl } from './test-database.js';

class CapturingMailer extends PasswordMailer {
  token = '';
  async sendPasswordReset(_email: string, token: string) {
    this.token = token;
    return true;
  }
}
class LoginBarrier extends AuthConcurrencyProbe {
  enabled = false;
  reached!: () => void;
  release!: () => void;
  reachedPromise = Promise.resolve();
  releasePromise = Promise.resolve();
  arm() {
    this.enabled = true;
    this.reachedPromise = new Promise<void>((resolve) => {
      this.reached = resolve;
    });
    this.releasePromise = new Promise<void>((resolve) => {
      this.release = resolve;
    });
  }
  override async afterPasswordVerified() {
    if (this.enabled) {
      this.reached();
      await this.releasePromise;
      this.enabled = false;
    }
  }
}

describe('concorrência entre login e reset', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const mailer = new CapturingMailer();
  const barrier = new LoginBarrier();
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
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PasswordMailer)
      .useValue(mailer)
      .overrideProvider(AuthConcurrencyProbe)
      .useValue(barrier)
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
    await prisma.passwordResetToken.deleteMany();
    await prisma.authSession.deleteMany();
    await prisma.earning.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.user.deleteMany();
  });

  it('login que verificou o hash antigo não cria sessão após reset concluído', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .set(headers)
      .send({ name: 'Corrida', email: 'corrida-login@example.com', password: 'senha anterior' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .set(headers)
      .send({ email: 'corrida-login@example.com' })
      .expect(202);
    barrier.arm();
    const pendingLogin = request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'corrida-login@example.com', password: 'senha anterior' });
    void pendingLogin.then(() => undefined);
    await barrier.reachedPromise;
    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .set(headers)
      .send({ token: mailer.token, password: 'senha posterior' })
      .expect(204);
    barrier.release();
    expect((await pendingLogin).status).toBe(401);
    expect(await prisma.authSession.count()).toBe(0);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'corrida-login@example.com', password: 'senha posterior' })
      .expect(200);
  });
});
