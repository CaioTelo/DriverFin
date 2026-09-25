export interface DecimalLimits {
  maxIntegerDigits: number;
  scale?: number;
  minimum?: string;
  minimumExclusive?: boolean;
  maximum?: string;
}

export function isDecimalStringInRange(value: unknown, limits: DecimalLimits): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  const scale = limits.scale ?? 2;
  const match = value.match(new RegExp(`^(\\d+)(?:\\.(\\d{1,${scale}}))?$`));
  if (!match || match[1].length > limits.maxIntegerDigits) return false;

  const scaled = toScaledInteger(match[1], match[2] ?? '', scale);
  if (limits.minimum !== undefined) {
    const minimum = decimalLiteralToScaledInteger(limits.minimum, scale);
    if (limits.minimumExclusive ? scaled <= minimum : scaled < minimum) return false;
  }
  if (
    limits.maximum !== undefined &&
    scaled > decimalLiteralToScaledInteger(limits.maximum, scale)
  ) {
    return false;
  }
  return true;
}

export function normalizeDecimalInput(value: string): string {
  return value.replace(',', '.');
}

function decimalLiteralToScaledInteger(value: string, scale: number): bigint {
  const [integer, fraction = ''] = value.split('.');
  return toScaledInteger(integer, fraction, scale);
}

function toScaledInteger(integer: string, fraction: string, scale: number): bigint {
  return BigInt(integer) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0'));
}
