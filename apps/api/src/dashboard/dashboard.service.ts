import { Injectable } from '@nestjs/common';
import {
  periodBounds,
  PRODUCT_TIME_ZONE,
  type DashboardPeriod,
} from '../common/calendar/calendar.js';
import { SystemClock } from '../common/calendar/clock.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  buildFinancialSummary,
  formatScaled,
  sumExactDecimals,
} from './domain/financial-summary.js';

type RecentEntry = {
  id: string;
  type: 'earning' | 'expense';
  date: string;
  label: string;
  amount: string;
  createdAt: string;
};

const dateString = (value: Date) => value.toISOString().slice(0, 10);
const decimalString = (value: { toString(): string } | null | undefined) =>
  value?.toString() ?? '0';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, period: DashboardPeriod) {
    const bounds = periodBounds(period, new SystemClock());
    const date = {
      gte: new Date(`${bounds.startDate}T00:00:00.000Z`),
      lte: new Date(`${bounds.endDate}T00:00:00.000Z`),
    };
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
        const where = { userId, date };
        const [
          earningTotals,
          expenseTotals,
          platforms,
          categories,
          earningsByPlatform,
          expensesByCategory,
          earningsByDate,
          expensesByDate,
          recentEarnings,
          recentExpenses,
        ] = await Promise.all([
          tx.earning.aggregate({ where, _sum: { amount: true, hours: true, kilometers: true } }),
          tx.expense.aggregate({ where, _sum: { amount: true } }),
          tx.platform.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
          tx.expenseCategory.findMany({
            orderBy: { sortOrder: 'asc' },
            select: { id: true, name: true },
          }),
          tx.earning.groupBy({ by: ['platformId'], where, _sum: { amount: true } }),
          tx.expense.groupBy({ by: ['categoryId'], where, _sum: { amount: true } }),
          tx.earning.groupBy({ by: ['date'], where, _sum: { amount: true } }),
          tx.expense.groupBy({ by: ['date'], where, _sum: { amount: true } }),
          tx.earning.findMany({
            where,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
            take: 5,
            select: {
              id: true,
              date: true,
              amount: true,
              createdAt: true,
              platform: { select: { name: true } },
            },
          }),
          tx.expense.findMany({
            where,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
            take: 5,
            select: {
              id: true,
              date: true,
              amount: true,
              createdAt: true,
              category: { select: { name: true } },
            },
          }),
        ]);

        const revenueCents = sumExactDecimals([decimalString(earningTotals._sum.amount)]);
        const expenseCents = sumExactDecimals([decimalString(expenseTotals._sum.amount)]);
        const hoursHundredths = sumExactDecimals([decimalString(earningTotals._sum.hours)]);
        const kilometersHundredths = sumExactDecimals([
          decimalString(earningTotals._sum.kilometers),
        ]);
        const financial = buildFinancialSummary({
          revenueCents,
          expenseCents,
          hoursHundredths,
          kilometersHundredths,
        });
        const platformAmounts = new Map(
          earningsByPlatform.map((item) => [item.platformId, decimalString(item._sum.amount)]),
        );
        const categoryAmounts = new Map(
          expensesByCategory.map((item) => [item.categoryId, decimalString(item._sum.amount)]),
        );
        const dailyRevenue = new Map(
          earningsByDate.map((item) => [
            dateString(item.date),
            sumExactDecimals([decimalString(item._sum.amount)]),
          ]),
        );
        const dailyExpenses = new Map(
          expensesByDate.map((item) => [
            dateString(item.date),
            sumExactDecimals([decimalString(item._sum.amount)]),
          ]),
        );
        const recent: RecentEntry[] = [
          ...recentEarnings.map((item) => ({
            id: item.id,
            type: 'earning' as const,
            date: dateString(item.date),
            label: item.platform.name,
            amount: decimalString(item.amount),
            createdAt: item.createdAt.toISOString(),
          })),
          ...recentExpenses.map((item) => ({
            id: item.id,
            type: 'expense' as const,
            date: dateString(item.date),
            label: item.category.name,
            amount: decimalString(item.amount),
            createdAt: item.createdAt.toISOString(),
          })),
        ]
          .sort(
            (a, b) =>
              b.date.localeCompare(a.date) ||
              b.createdAt.localeCompare(a.createdAt) ||
              b.id.localeCompare(a.id) ||
              b.type.localeCompare(a.type),
          )
          .slice(0, 5);

        return {
          period: { key: period, ...bounds, timezone: PRODUCT_TIME_ZONE },
          totals: {
            revenue: financial.revenue,
            expenses: financial.expenses,
            profit: financial.profit,
            hours: formatScaled(hoursHundredths),
            kilometers: formatScaled(kilometersHundredths),
          },
          indicators: {
            margin: financial.margin,
            revenuePerHour: financial.revenuePerHour,
            profitPerHour: financial.profitPerHour,
            revenuePerKm: financial.revenuePerKilometer,
            profitPerKm: financial.profitPerKilometer,
          },
          revenueByPlatform: platforms.flatMap((item) =>
            platformAmounts.has(item.id)
              ? [
                  {
                    ...item,
                    amount: formatScaled(sumExactDecimals([platformAmounts.get(item.id)!])),
                  },
                ]
              : [],
          ),
          expensesByCategory: categories.flatMap((item) =>
            categoryAmounts.has(item.id)
              ? [
                  {
                    ...item,
                    amount: formatScaled(sumExactDecimals([categoryAmounts.get(item.id)!])),
                  },
                ]
              : [],
          ),
          evolution: evolutionDates(period, bounds.startDate, bounds.seriesEndDate).map((day) => {
            const revenue = periodAmount(period, day, dailyRevenue);
            const expenses = periodAmount(period, day, dailyExpenses);
            return {
              date: day,
              revenue: formatScaled(revenue),
              expenses: formatScaled(expenses),
              profit: formatScaled(revenue - expenses),
            };
          }),
          recentEntries: recent,
          hasEntries: recent.length > 0,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}

function days(start: string, end: string): string[] {
  const result: string[] = [];
  for (
    let current = new Date(`${start}T00:00:00.000Z`), finish = new Date(`${end}T00:00:00.000Z`);
    current <= finish;
    current = new Date(current.getTime() + 86_400_000)
  )
    result.push(dateString(current));
  return result;
}

function evolutionDates(period: DashboardPeriod, start: string, end: string): string[] {
  if (period !== 'year') return days(start, end);
  const year = start.slice(0, 4);
  return Array.from(
    { length: 12 },
    (_, index) => `${year}-${String(index + 1).padStart(2, '0')}-01`,
  );
}

function periodAmount(period: DashboardPeriod, date: string, amounts: Map<string, bigint>): bigint {
  if (period !== 'year') return amounts.get(date) ?? 0n;
  const month = date.slice(0, 7);
  return [...amounts].reduce(
    (total, [day, amount]) => (day.startsWith(month) ? total + amount : total),
    0n,
  );
}
