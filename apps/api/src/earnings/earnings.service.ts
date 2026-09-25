import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { assertActiveSession, resourceUnavailable } from '../common/persistence/private-write.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SaveEarningDto } from './dto/save-earning.dto.js';

const select = {
  id: true,
  date: true,
  amount: true,
  rides: true,
  hours: true,
  kilometers: true,
  createdAt: true,
  updatedAt: true,
  platform: { select: { id: true, name: true } },
} as const;

@Injectable()
export class EarningsService {
  constructor(private readonly prisma: PrismaService) {}

  async platforms() {
    return {
      items: await this.prisma.platform.findMany({
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true },
      }),
    };
  }

  async list(userId: string, page: number) {
    const pageSize = 20;
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.earning.findMany({
          where: { userId },
          select,
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.earning.count({ where: { userId } }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { items, page, pageSize, total };
  }

  async findOne(userId: string, id: string) {
    const item = await this.prisma.earning.findFirst({ where: { id, userId }, select });
    if (!item) throw resourceUnavailable();
    return item;
  }

  create(userId: string, sessionId: string, input: SaveEarningDto) {
    return this.write(userId, sessionId, input, async (transaction, data) => {
      return transaction.earning.create({ data: { userId, ...data }, select });
    });
  }

  update(userId: string, sessionId: string, id: string, input: SaveEarningDto) {
    return this.write(userId, sessionId, input, async (transaction, data) => {
      const existing = await transaction.earning.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!existing) throw resourceUnavailable();
      return transaction.earning.update({ where: { id }, data, select });
    });
  }

  async remove(userId: string, sessionId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await assertActiveSession(transaction, userId, sessionId);
      const result = await transaction.earning.deleteMany({ where: { id, userId } });
      if (result.count === 0) throw resourceUnavailable();
    });
  }

  private async write<T>(
    userId: string,
    sessionId: string,
    input: SaveEarningDto,
    operation: (
      transaction: Prisma.TransactionClient,
      data: {
        date: Date;
        platformId: string;
        amount: string;
        rides: number;
        hours: string;
        kilometers: string;
      },
    ) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (transaction) => {
      await assertActiveSession(transaction, userId, sessionId);
      const platform = await transaction.platform.findUnique({
        where: { id: input.platformId },
        select: { id: true },
      });
      if (!platform)
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Revise os campos informados.',
          fields: { platformId: ['Selecione uma plataforma válida.'] },
          writeOutcome: 'not_applied',
        });
      return operation(transaction, { ...input, date: new Date(`${input.date}T00:00:00.000Z`) });
    });
  }
}
