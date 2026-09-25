import { describe, expect, it } from '@jest/globals';
import {
  buildFinancialSummary,
  decimalToScaledBigInt,
  formatScaled,
  roundHalfAwayFromZero,
  sumExactDecimals,
} from './financial-summary.js';

describe('fonte financeira única', () => {
  it('calcula o exemplo completo a partir dos totais', () => {
    expect(
      buildFinancialSummary({
        revenueCents: 30_000n,
        expenseCents: 12_000n,
        hoursHundredths: 600n,
        kilometersHundredths: 10_000n,
      }),
    ).toEqual({
      revenue: '300.00',
      expenses: '120.00',
      profit: '180.00',
      margin: { value: '60.00', reason: null },
      revenuePerHour: { value: '50.00', reason: null },
      profitPerHour: { value: '30.00', reason: null },
      revenuePerKilometer: { value: '3.00', reason: null },
      profitPerKilometer: { value: '1.80', reason: null },
    });
  });

  it('soma dinheiro exatamente, inclusive valores grandes', () => {
    expect(formatScaled(sumExactDecimals(['0.10', '0.20']))).toBe('0.30');
    expect(formatScaled(sumExactDecimals(['999999999999999999999999999999.99', '0.01']))).toBe(
      '1000000000000000000000000000000.00',
    );
  });

  it('trata prejuízo e empate afastando de zero', () => {
    expect(
      buildFinancialSummary({
        revenueCents: 10_000n,
        expenseCents: 12_000n,
        hoursHundredths: 100n,
        kilometersHundredths: 100n,
      }).profit,
    ).toBe('-20.00');
    expect(formatScaled(roundHalfAwayFromZero(5n, 10n))).toBe('0.01');
    expect(formatScaled(roundHalfAwayFromZero(-5n, 10n))).toBe('-0.01');
  });

  it('expõe indisponibilidade, nunca zero, para denominadores nulos', () => {
    const result = buildFinancialSummary({
      revenueCents: 0n,
      expenseCents: 0n,
      hoursHundredths: 0n,
      kilometersHundredths: 0n,
    });
    expect(result.margin).toEqual({ value: null, reason: 'NO_REVENUE' });
    expect(result.revenuePerHour).toEqual({ value: null, reason: 'NO_HOURS' });
    expect(result.profitPerKilometer).toEqual({ value: null, reason: 'NO_KILOMETERS' });
  });

  it('calcula razão dos totais em vez da média das razões individuais', () => {
    const result = buildFinancialSummary({
      revenueCents: decimalToScaledBigInt('300.00'),
      expenseCents: 0n,
      hoursHundredths: decimalToScaledBigInt('4.00'),
      kilometersHundredths: 100n,
    });
    expect(result.revenuePerHour.value).toBe('75.00');
  });
});
