import { randomUUID } from 'node:crypto';
import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';
import { Public } from './auth/public.decorator.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  @Header('Cache-Control', 'private, no-store')
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Serviço temporariamente indisponível.',
          requestId: randomUUID(),
        },
      });
    }
  }
}
