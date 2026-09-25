export interface UnavailableMetric {
  value: null;
  reason: 'NO_REVENUE' | 'NO_HOURS' | 'NO_KILOMETERS';
}

export interface AvailableMetric {
  value: string;
  reason: null;
}

export type FinancialMetric = AvailableMetric | UnavailableMetric;

export interface FinancialSummaryInput {
  revenueCents: bigint;
  expenseCents: bigint;
  hoursHundredths: bigint;
  kilometersHundredths: bigint;
}

export interface FinancialSummary {
  revenue: string;
  expenses: string;
  profit: string;
  margin: FinancialMetric;
  revenuePerHour: FinancialMetric;
  profitPerHour: FinancialMetric;
  revenuePerKilometer: FinancialMetric;
  profitPerKilometer: FinancialMetric;
}

export function decimalToScaledBigInt(value: string, scale = 2): bigint {
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) throw new Error(`Decimal inválido: ${value}`);
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  if (fraction.length > scale) throw new Error(`Escala maior que ${scale}: ${value}`);
  const scaled = BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0'));
  return negative ? -scaled : scaled;
}

export function sumExactDecimals(values: readonly string[]): bigint {
  return values.reduce((total, value) => total + decimalToScaledBigInt(value), 0n);
}

export function roundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error('O denominador deve ser positivo.');
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  const quotient = absolute / denominator;
  const remainder = absolute % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

export function formatScaled(value: bigint, scale = 2): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const divisor = 10n ** BigInt(scale);
  return `${negative ? '-' : ''}${absolute / divisor}.${String(absolute % divisor).padStart(scale, '0')}`;
}

function ratio(
  numeratorCents: bigint,
  denominatorHundredths: bigint,
  reason: UnavailableMetric['reason'],
): FinancialMetric {
  if (denominatorHundredths === 0n) return { value: null, reason };
  return {
    value: formatScaled(roundHalfAwayFromZero(numeratorCents * 100n, denominatorHundredths)),
    reason: null,
  };
}

export function buildFinancialSummary(input: FinancialSummaryInput): FinancialSummary {
  const profitCents = input.revenueCents - input.expenseCents;
  const margin: FinancialMetric =
    input.revenueCents === 0n
      ? { value: null, reason: 'NO_REVENUE' }
      : {
          value: formatScaled(roundHalfAwayFromZero(profitCents * 10_000n, input.revenueCents)),
          reason: null,
        };
  return {
    revenue: formatScaled(input.revenueCents),
    expenses: formatScaled(input.expenseCents),
    profit: formatScaled(profitCents),
    margin,
    revenuePerHour: ratio(input.revenueCents, input.hoursHundredths, 'NO_HOURS'),
    profitPerHour: ratio(profitCents, input.hoursHundredths, 'NO_HOURS'),
    revenuePerKilometer: ratio(input.revenueCents, input.kilometersHundredths, 'NO_KILOMETERS'),
    profitPerKilometer: ratio(profitCents, input.kilometersHundredths, 'NO_KILOMETERS'),
  };
}
