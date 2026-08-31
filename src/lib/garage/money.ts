export function dollars(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function signedDollars(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  const formatted = dollars(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

export function compactNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

export function milesLabel(value: number | null | undefined) {
  if (value == null) return '—';
  return `${compactNumber(value)} mi`;
}

export function hoursLabel(value: number | null | undefined) {
  if (value == null) return '—';
  return `${compactNumber(value)} hrs`;
}
