import 'dotenv/config';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { HealthController } from '../../src/health.controller.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

describe('health HTTP com Prisma ESM', () => {
  let healthy: INestApplication;
  let unavailable: INestApplication;

  async function createApp(databaseUrl: string): Promise<INestApplication> {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: new PrismaService(new ConfigService({ DATABASE_URL: databaseUrl })),
        },
      ],
    }).compile();
    const app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    return app;
  }

  beforeAll(async () => {
    const databaseUrl = process.env.TEST_DATABASE_URL;
    if (!databaseUrl || new URL(databaseUrl).pathname !== '/driverfin_test') {
      throw new Error('O smoke exige TEST_DATABASE_URL com database driverfin_test.');
    }
    healthy = await createApp(databaseUrl);
    unavailable = await createApp('postgresql://fixture:fixture-secret@127.0.0.1:1/driverfin_test');
  });

  afterAll(async () => {
    await healthy?.close();
    await unavailable?.close();
  });

  it('consulta PostgreSQL real e retorna apenas status ok, sem cache', async () => {
    const response = await request(healthy.getHttpServer()).get('/api/health').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['cache-control']).toBe('private, no-store');
  });

  it('retorna 503 sanitizado quando o banco não responde', async () => {
    const response = await request(unavailable.getHttpServer()).get('/api/health').expect(503);
    expect(response.body).toEqual({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Serviço temporariamente indisponível.',
        requestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
    });
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.text).not.toMatch(/fixture-secret|postgresql|SELECT|stack|writeOutcome/);
  });
});
