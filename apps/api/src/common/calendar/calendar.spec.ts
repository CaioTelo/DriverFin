import { describe, expect, it } from '@jest/globals';
import { FixedClock } from './clock.js';
import {
  currentProductDate,
  isFinancialDate,
  maximumVehicleYear,
  parseCalendarDate,
  periodBounds,
} from './calendar.js';

describe('calendário do produto', () => {
  const clock = new FixedClock(new Date('2026-09-08T15:00:00.000Z'));

  it('calcula today, week e month com limites inclusivos e série até hoje', () => {
    expect(periodBounds('today', clock)).toEqual({
      startDate: '2026-09-08',
      endDate: '2026-09-08',
      seriesEndDate: '2026-09-08',
    });
    expect(periodBounds('week', clock)).toEqual({
      startDate: '2026-09-07',
      endDate: '2026-09-13',
      seriesEndDate: '2026-09-08',
    });
    expect(periodBounds('month', clock)).toEqual({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      seriesEndDate: '2026-09-08',
    });
  });

  it('usa America/Sao_Paulo próximo da meia-noite', () => {
    const beforeMidnight = new FixedClock(new Date('2026-09-08T02:59:59.000Z'));
    expect(currentProductDate(beforeMidnight)).toEqual({ year: 2026, month: 9, day: 7 });
  });

  it.each([
    ['2024-02-29', true],
    ['2023-02-29', false],
    ['2026-02-30', false],
    ['2026-09-08', true],
    ['2026-09-09', false],
    ['', false],
  ])('valida a data financeira %s', (value, expected) => {
    expect(isFinancialDate(value, clock)).toBe(expected);
  });

  it('cobre segunda, domingo e viradas de mês e ano', () => {
    expect(periodBounds('week', new FixedClock(new Date('2026-09-07T15:00:00Z')))).toMatchObject({
      startDate: '2026-09-07',
      endDate: '2026-09-13',
    });
    expect(periodBounds('week', new FixedClock(new Date('2026-09-13T15:00:00Z')))).toMatchObject({
      startDate: '2026-09-07',
      endDate: '2026-09-13',
    });
    expect(periodBounds('week', new FixedClock(new Date('2027-01-01T15:00:00Z')))).toMatchObject({
      startDate: '2026-12-28',
      endDate: '2027-01-03',
    });
    expect(periodBounds('month', new FixedClock(new Date('2024-02-29T15:00:00Z')))).toMatchObject({
      startDate: '2024-02-01',
      endDate: '2024-02-29',
    });
  });

  it('limita ano de veículo pelo relógio injetado', () => {
    expect(maximumVehicleYear(clock)).toBe(2027);
    expect(parseCalendarDate('2026-01-01')).not.toBeNull();
  });
});
