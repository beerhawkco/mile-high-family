import type { Snapshot } from './types.ts';

export function sparkPath(values: number[], width = 220, height = 64, pad = 4) {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  return values
    .map((value, index) => {
      const x = pad + (values.length === 1 ? innerW / 2 : (index / (values.length - 1)) * innerW);
      const y = pad + innerH - ((value - min) / span) * innerH;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export function medianSeries(snapshots: Snapshot[]) {
  return snapshots.map((item) => item.askingMedian);
}

export function sentimentSeries(snapshots: Snapshot[]) {
  return snapshots.map((item) => item.sentimentScore);
}
