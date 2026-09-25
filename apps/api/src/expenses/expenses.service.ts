import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { assertActiveSession, resourceUnavailable } from '../common/persistence/private-write.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SaveExpenseDto } from './dto/save-expense.dto.js';

const select = {
  id: true,
  date: true,
  amount: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}
  async categories() {
    return {
      items: await this.prisma.expenseCategory.findMany({
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true },
      }),
    };
  }
  async list(userId: string, page: number) {
    const pageSize = 20;
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.expense.findMany({
          where: { userId },
          select,
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.expense.count({ where: { userId } }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { items, page, pageSize, total };
  }
  async findOne(userId: string, id: string) {
    const item = await this.prisma.expense.findFirst({ where: { id, userId }, select });
    if (!item) throw resourceUnavailable();
    return item;
  }
  create(userId: string, sessionId: string, input: SaveExpenseDto) {
    return this.write(userId, sessionId, input, (transaction, data) =>
      transaction.expense.create({ data: { userId, ...data }, select }),
    );
  }
  update(userId: string, sessionId: string, id: string, input: SaveExpenseDto) {
    return this.write(userId, sessionId, input, async (transaction, data) => {
      const existing = await transaction.expense.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!existing) throw resourceUnavailable();
      return transaction.expense.update({ where: { id }, data, select });
    });
  }
  async remove(userId: string, sessionId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await assertActiveSession(transaction, userId, sessionId);
      if ((await transaction.expense.deleteMany({ where: { id, userId } })).count === 0)
        throw resourceUnavailable();
    });
  }
  private async write<T>(
    userId: string,
    sessionId: string,
    input: SaveExpenseDto,
    operation: (
      transaction: Prisma.TransactionClient,
      data: { date: Date; categoryId: string; amount: string; description: string | null },
    ) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (transaction) => {
      await assertActiveSession(transaction, userId, sessionId);
      if (
        !(await transaction.expenseCategory.findUnique({
          where: { id: input.categoryId },
          select: { id: true },
        }))
      ) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Revise os campos informados.',
          fields: { categoryId: ['Selecione uma categoria válida.'] },
          writeOutcome: 'not_applied',
        });
      }
      return operation(transaction, {
        date: new Date(`${input.date}T00:00:00.000Z`),
        categoryId: input.categoryId,
        amount: input.amount,
        description: input.description ?? null,
      });
    });
  }
}
