import type { Snapshot } from './types.ts';

export function sparkPoints(values: number[], width = 220, height = 64, pad = 4) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  return values.map((value, index) => ({
    x: pad + (values.length === 1 ? innerW / 2 : (index / (values.length - 1)) * innerW),
    y: pad + innerH - ((value - min) / span) * innerH,
  }));
}

export function sparkPath(values: number[], width = 220, height = 64, pad = 4) {
  return sparkPoints(values, width, height, pad)
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
}

export function gaugeDegrees(value: number | null | undefined, min = -100, max = 100) {
  if (value == null || Number.isNaN(value) || max === min) return 90;
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return t * 180;
}

export function gaugeNeedle(cx: number, cy: number, length: number, degrees: number) {
  const rad = ((180 - degrees) * Math.PI) / 180;
  return {
    x: cx + Math.cos(rad) * length,
    y: cy - Math.sin(rad) * length,
  };
}

export function medianSeries(snapshots: Snapshot[]) {
  return snapshots.map((item) => item.askingMedian);
}

export function sentimentSeries(snapshots: Snapshot[]) {
  return snapshots.map((item) => item.sentimentScore);
}
