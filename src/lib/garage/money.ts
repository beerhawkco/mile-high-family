export function dollars(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function compactDollars(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1000) {
    const k = abs / 1000;
    const text = abs >= 10_000 || Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1);
    return `${sign}$${text}k`;
  }
  return `${sign}$${Math.round(abs)}`;
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
