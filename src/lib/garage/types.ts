export const VEHICLE_IDS = ['thor-majestic-28a', 'tesla-model-y-lr'] as const;
export type VehicleId = (typeof VEHICLE_IDS)[number];

export const SENTIMENT_TONES = ['hot', 'warm', 'cool', 'cold'] as const;
export type SentimentTone = (typeof SENTIMENT_TONES)[number];

export const TRENDS = ['up', 'flat', 'down'] as const;
export type Trend = (typeof TRENDS)[number];

export const COMP_STATUSES = ['active', 'sold', 'expired'] as const;
export type CompStatus = (typeof COMP_STATUSES)[number];

export const NOTE_TONES = ['positive', 'neutral', 'negative'] as const;
export type NoteTone = (typeof NOTE_TONES)[number];

export const PULSE_SOURCES = ['admin', 'auto', 'seed'] as const;
export type PulseSource = (typeof PULSE_SOURCES)[number];

export type VehicleKind = 'rv' | 'ev';

export type Spec = {
  label: string;
  value: string;
};

export type Vehicle = {
  id: VehicleId;
  year: number;
  make: string;
  model: string;
  trim: string;
  kind: VehicleKind;
  name: string;
  shortName: string;
  category: string;
  summary: string;
  notes: string;
  hero: string;
  heroAlt: string;
  heroCredit: string;
  specs: Spec[];
};

export type Snapshot = {
  id: string;
  vehicleId: VehicleId;
  date: string;
  askingLow: number;
  askingHigh: number;
  askingMedian: number;
  soldMedian: number | null;
  listingCount: number;
  daysOnMarket: number;
  sentiment: SentimentTone;
  sentimentScore: number;
  trend: Trend;
  headline: string;
  brief: string;
  source: PulseSource;
  needsReview: boolean;
};

export type Comp = {
  id: string;
  vehicleId: VehicleId;
  title: string;
  year: number;
  price: number;
  miles: number | null;
  hours: number | null;
  location: string;
  condition: string;
  source: string;
  url: string;
  listedOn: string;
  status: CompStatus;
  notes: string;
};

export type SentimentNote = {
  id: string;
  vehicleId: VehicleId;
  date: string;
  source: string;
  tone: NoteTone;
  summary: string;
  url: string;
};

export type GarageStore = {
  version: 1;
  updatedAt: string;
  vehicles: Vehicle[];
  snapshots: Snapshot[];
  comps: Comp[];
  sentiments: SentimentNote[];
};
