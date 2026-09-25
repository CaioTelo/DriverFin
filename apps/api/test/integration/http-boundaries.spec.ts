import type { INestApplication } from '@nestjs/common';
import { BadRequestException, Body, Controller, Get, Module, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { IsString, Length } from 'class-validator';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { Prisma } from '../../src/generated/prisma/client.js';
import { configureApplication } from '../../src/application.js';
import {
  ConfirmedRollbackException,
  UnknownWriteOutcomeException,
} from '../../src/common/filters/application.exception.js';

class FixtureDto {
  @IsString({ message: 'Informe o nome.' })
  @Length(1, 20, { message: 'Nome deve ter entre 1 e 20 caracteres.' })
  name!: string;
}

@Controller('fixture')
class FixtureController {
  @Post('validate')
  validate(@Body() body: FixtureDto): FixtureDto {
    return body;
  }

  @Post('rollback')
  rollback(): never {
    throw new ConfirmedRollbackException();
  }

  @Post('unknown')
  unknown(): never {
    throw new UnknownWriteOutcomeException();
  }

  @Get('error')
  error(): never {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Revise os campos informados.',
    });
  }

  @Get('serialized')
  serialized(): object {
    return {
      amount: new Prisma.Decimal('123.4'),
      date: new Date('2026-09-24T00:00:00.000Z'),
      createdAt: new Date('2026-09-24T12:34:56.789Z'),
    };
  }
}

@Module({ controllers: [FixtureController] })
class FixtureModule {}

describe('fronteiras REST comuns', () => {
  let app: INestApplication;
  const headers = {
    Origin: 'http://localhost:3000',
    'X-DriverFin-Client': 'web',
    'Content-Type': 'application/json',
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [FixtureModule],
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService({ WEB_ORIGIN: 'http://localhost:3000' }),
        },
      ],
    }).compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => app.close());

  it('rejeita propriedades extras e userId sem coerção permissiva', async () => {
    const extra = await request(app.getHttpServer())
      .post('/api/fixture/validate')
      .set(headers)
      .send({ name: 'Motorista', userId: 'proibido' })
      .expect(400);
    expect(extra.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      writeOutcome: 'not_applied',
    });
    expect(extra.body.error.fields.userId).toBeDefined();

    const empty = await request(app.getHttpServer())
      .post('/api/fixture/validate')
      .set(headers)
      .send({ name: 0 })
      .expect(400);
    expect(empty.body.error.fields.name).toBeDefined();
  });

  it('rejeita origem, cabeçalho de cliente e mídia inválidos antes da escrita', async () => {
    const origin = await request(app.getHttpServer())
      .post('/api/fixture/validate')
      .set({ ...headers, Origin: 'https://maliciosa.example' })
      .send({ name: 'A' })
      .expect(403);
    expect(origin.body.error).toMatchObject({
      code: 'ORIGIN_NOT_ALLOWED',
      writeOutcome: 'not_applied',
    });

    await request(app.getHttpServer())
      .post('/api/fixture/validate')
      .set({ Origin: headers.Origin, 'X-DriverFin-Client': 'web' })
      .type('text')
      .send('name=A')
      .expect(415);
  });

  it('distingue rollback confirmado de resultado desconhecido', async () => {
    const rollback = await request(app.getHttpServer())
      .post('/api/fixture/rollback')
      .set(headers)
      .send({})
      .expect(500);
    expect(rollback.body.error.writeOutcome).toBe('not_applied');

    const unknown = await request(app.getHttpServer())
      .post('/api/fixture/unknown')
      .set(headers)
      .send({})
      .expect(500);
    expect(unknown.body.error.writeOutcome).toBe('unknown');
  });

  it('omite writeOutcome em GET e serializa datas/decimais sem ponto flutuante', async () => {
    const error = await request(app.getHttpServer()).get('/api/fixture/error').expect(400);
    expect(error.body.error.writeOutcome).toBeUndefined();
    expect(error.body.error.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(error.headers['cache-control']).toBe('private, no-store');

    const serialized = await request(app.getHttpServer())
      .get('/api/fixture/serialized')
      .expect(200);
    expect(serialized.body).toEqual({
      amount: '123.40',
      date: '2026-09-24',
      createdAt: '2026-09-24T12:34:56.789Z',
    });
  });
});
