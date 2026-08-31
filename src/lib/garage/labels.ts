import type { CompStatus, NoteTone, OwnedStatus, SentimentTone, Trend, VehicleKind } from './types.ts';

export const TONE_LABEL: Record<SentimentTone, string> = {
  hot: 'Hot',
  warm: 'Warm',
  cool: 'Cool',
  cold: 'Cold',
};

export const TREND_LABEL: Record<Trend, string> = {
  up: 'Up',
  flat: 'Flat',
  down: 'Down',
};

export const COMP_LABEL: Record<CompStatus, string> = {
  active: 'Active',
  sold: 'Sold',
  expired: 'Expired',
};

export const NOTE_LABEL: Record<NoteTone, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
};

export const KIND_LABEL: Record<VehicleKind, string> = {
  rv: 'RV',
  car: 'Car',
};

export const SECTION_LABEL = {
  cars: 'Cars',
  rvs: 'RVs',
} as const;

export const OWNED_LABEL: Record<OwnedStatus, string> = {
  preparing: 'Not listed yet',
  listed: 'Listed',
  sold: 'Sold',
};

export function prettyDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
