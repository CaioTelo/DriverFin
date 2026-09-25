import { describe, expect, it } from '@jest/globals';
import { isDecimalStringInRange, normalizeDecimalInput } from './decimal.js';

describe('validação decimal estrita', () => {
  const money = { maxIntegerDigits: 63, scale: 2, minimum: '0', minimumExclusive: true };

  it.each(['0.01', '1', '1.2', '1.23', '0001.20'])(
    'aceita %s sem converter para Number',
    (value) => {
      expect(isDecimalStringInRange(value, money)).toBe(true);
    },
  );

  it.each(['', ' ', '1e2', '1.234', '-1', '+1', '.5', 'NaN', 'Infinity'])('rejeita %s', (value) => {
    expect(isDecimalStringInRange(value, money)).toBe(false);
  });

  it('rejeita zero, excesso de precisão e valores fora da faixa', () => {
    expect(isDecimalStringInRange('0', money)).toBe(false);
    expect(isDecimalStringInRange(`${'9'.repeat(64)}.00`, money)).toBe(false);
    expect(
      isDecimalStringInRange('24.01', {
        maxIntegerDigits: 2,
        scale: 2,
        minimum: '0',
        maximum: '24',
      }),
    ).toBe(false);
    expect(
      isDecimalStringInRange('24.00', {
        maxIntegerDigits: 2,
        scale: 2,
        minimum: '0',
        maximum: '24',
      }),
    ).toBe(true);
  });

  it('normaliza apenas o separador sem arredondar ou truncar', () => {
    expect(normalizeDecimalInput('12345678901234567890,12')).toBe('12345678901234567890.12');
    expect(normalizeDecimalInput('')).toBe('');
  });
});
