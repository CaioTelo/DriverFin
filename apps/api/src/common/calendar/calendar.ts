import type { Clock } from './clock.js';

export const PRODUCT_TIME_ZONE = 'America/Sao_Paulo';

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export type DashboardPeriod = 'today' | 'week' | 'month';

export interface PeriodBounds {
  startDate: string;
  endDate: string;
  seriesEndDate: string;
}

const saoPauloFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: PRODUCT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function currentProductDate(clock: Clock): CalendarDate {
  const parts = saoPauloFormatter.formatToParts(clock.now());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(value.year), month: Number(value.month), day: Number(value.day) };
}

export function parseCalendarDate(value: unknown): CalendarDate | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function isFinancialDate(value: unknown, clock: Clock): value is string {
  const parsed = parseCalendarDate(value);
  return parsed !== null && compareCalendarDates(parsed, currentProductDate(clock)) <= 0;
}

export function maximumVehicleYear(clock: Clock): number {
  return currentProductDate(clock).year + 1;
}

export function periodBounds(period: DashboardPeriod, clock: Clock): PeriodBounds {
  const today = currentProductDate(clock);
  if (period === 'today') {
    const date = formatCalendarDate(today);
    return { startDate: date, endDate: date, seriesEndDate: date };
  }

  if (period === 'month') {
    return {
      startDate: formatCalendarDate({ ...today, day: 1 }),
      endDate: formatCalendarDate({ ...today, day: daysInMonth(today.year, today.month) }),
      seriesEndDate: formatCalendarDate(today),
    };
  }

  const utc = Date.UTC(today.year, today.month - 1, today.day);
  const weekday = new Date(utc).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  return {
    startDate: formatCalendarDate(fromUtcDate(new Date(utc - mondayOffset * 86_400_000))),
    endDate: formatCalendarDate(fromUtcDate(new Date(utc + (6 - mondayOffset) * 86_400_000))),
    seriesEndDate: formatCalendarDate(today),
  };
}

export function formatCalendarDate(date: CalendarDate): string {
  return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function compareCalendarDates(left: CalendarDate, right: CalendarDate): number {
  return left.year - right.year || left.month - right.month || left.day - right.day;
}

function fromUtcDate(value: Date): CalendarDate {
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() };
}
