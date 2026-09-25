export function normalizeDecimalInput(value: string): string {
  return value.replace(',', '.');
}

export function formatDecimal(value: string): string {
  const match = value.match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return value;
  const [, sign, integer, fraction = ''] = match;
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${grouped},${fraction.padEnd(2, '0')}`;
}

export function formatCurrency(value: string): string {
  return `R$ ${formatDecimal(value)}`;
}
export function formatMoney(value: string): string {
  const [integer, fraction = '00'] = value.split('.');
  return `R$ ${BigInt(integer).toLocaleString('pt-BR')},${fraction.padEnd(2, '0')}`;
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function productToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export const normalizeDecimal = (value: string) => value.replace(',', '.');
