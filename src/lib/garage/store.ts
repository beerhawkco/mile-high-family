import { snapshotId } from './ids.ts';
import {
  COMP_STATUSES,
  INTENTS,
  NOTE_TONES,
  OWNED_STATUSES,
  PULSE_SOURCES,
  SENTIMENT_TONES,
  TRENDS,
  VEHICLE_IDS,
  type Comp,
  type GarageStore,
  type MarketListing,
  type OwnedUnit,
  type PulseSource,
  type SentimentNote,
  type Snapshot,
  type Vehicle,
  type VehicleId,
} from './types.ts';

export const STORE_PATH = 'src/content/garage/store.json';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isVehicleId(value: unknown): value is VehicleId {
  return typeof value === 'string' && (VEHICLE_IDS as readonly string[]).includes(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function dateOk(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function emptyOwned(): OwnedUnit {
  return {
    status: 'preparing',
    askingPrice: null,
    targetPrice: null,
    listedOn: '',
    miles: null,
    hours: null,
    condition: '',
    listingUrl: '',
    soldPrice: null,
    soldOn: '',
    notes: '',
  };
}

export function emptyStore(updatedAt = new Date().toISOString()): GarageStore {
  return {
    version: 1,
    updatedAt,
    market: { center: 'Denver, CO', radiusMiles: 250 },
    vehicles: [],
    snapshots: [],
    comps: [],
    sentiments: [],
    listings: [],
  };
}

export function cloneStore(store: GarageStore): GarageStore {
  return structuredClone(store);
}

export function parseStore(raw: unknown): GarageStore {
  if (!isObject(raw) || raw.version !== 1) {
    throw new Error('Garage store is missing or the wrong version.');
  }
  if (!isString(raw.updatedAt)) throw new Error('Garage store is missing updatedAt.');
  if (!Array.isArray(raw.vehicles)) throw new Error('Garage store is missing vehicles.');
  if (!Array.isArray(raw.snapshots)) throw new Error('Garage store is missing snapshots.');
  if (!Array.isArray(raw.comps)) throw new Error('Garage store is missing comps.');
  if (!Array.isArray(raw.sentiments)) throw new Error('Garage store is missing sentiments.');

  const store: GarageStore = {
    version: 1,
    updatedAt: raw.updatedAt,
    market: parseMarket(raw.market),
    vehicles: raw.vehicles.map(parseVehicle),
    snapshots: raw.snapshots.map(parseSnapshot),
    comps: raw.comps.map(parseComp),
    sentiments: raw.sentiments.map(parseSentiment),
    listings: Array.isArray(raw.listings) ? raw.listings.map(parseListing) : [],
  };
  return store;
}

function parseMarket(raw: unknown) {
  if (isObject(raw) && isString(raw.center) && isFiniteNumber(raw.radiusMiles)) {
    return { center: raw.center, radiusMiles: raw.radiusMiles };
  }
  return { center: 'Denver, CO', radiusMiles: 250 };
}

function parseVehicle(raw: unknown): Vehicle {
  if (!isObject(raw) || !isVehicleId(raw.id)) throw new Error('A vehicle record is invalid.');
  if (!isString(raw.name) || !isString(raw.shortName)) throw new Error(`Vehicle ${raw.id} is missing a name.`);
  if (typeof raw.year !== 'number' || !isString(raw.make) || !isString(raw.model) || !isString(raw.trim)) {
    throw new Error(`Vehicle ${raw.id} is missing year/make/model.`);
  }
  const kind = raw.kind === 'rv' ? 'rv' : 'car';
  if (!Array.isArray(raw.specs)) throw new Error(`Vehicle ${raw.id} is missing specs.`);
  return {
    id: raw.id,
    year: raw.year,
    make: raw.make,
    model: raw.model,
    trim: raw.trim,
    kind,
    intent: (INTENTS as readonly string[]).includes(String(raw.intent)) ? (raw.intent as Vehicle['intent']) : 'sell',
    name: raw.name,
    shortName: raw.shortName,
    category: isString(raw.category) ? raw.category : '',
    summary: isString(raw.summary) ? raw.summary : '',
    notes: isString(raw.notes) ? raw.notes : '',
    hero: isString(raw.hero) ? raw.hero : '',
    heroAlt: isString(raw.heroAlt) ? raw.heroAlt : '',
    heroCredit: isString(raw.heroCredit) ? raw.heroCredit : '',
    specs: raw.specs
      .filter((item): item is { label: string; value: string } => {
        return isObject(item) && isString(item.label) && isString(item.value);
      })
      .map((item) => ({ label: item.label, value: item.value })),
    owned: parseOwned(raw.owned),
  };
}

function parseOwned(raw: unknown): OwnedUnit {
  const base = emptyOwned();
  if (!isObject(raw)) return base;
  return {
    status: (OWNED_STATUSES as readonly string[]).includes(String(raw.status))
      ? (raw.status as OwnedUnit['status'])
      : base.status,
    askingPrice: raw.askingPrice == null || raw.askingPrice === '' ? null : Number(raw.askingPrice),
    targetPrice: raw.targetPrice == null || raw.targetPrice === '' ? null : Number(raw.targetPrice),
    listedOn: dateOk(raw.listedOn) ? raw.listedOn : '',
    miles: raw.miles == null || raw.miles === '' ? null : Number(raw.miles),
    hours: raw.hours == null || raw.hours === '' ? null : Number(raw.hours),
    condition: isString(raw.condition) ? raw.condition : '',
    listingUrl: isString(raw.listingUrl) ? raw.listingUrl : '',
    soldPrice: raw.soldPrice == null || raw.soldPrice === '' ? null : Number(raw.soldPrice),
    soldOn: dateOk(raw.soldOn) ? raw.soldOn : '',
    notes: isString(raw.notes) ? raw.notes : '',
  };
}

function parseSnapshot(raw: unknown): Snapshot {
  if (!isObject(raw) || !isString(raw.id) || !isVehicleId(raw.vehicleId) || !dateOk(raw.date)) {
    throw new Error('A snapshot is missing an id, vehicle, or date.');
  }
  if (
    !isFiniteNumber(raw.askingLow) ||
    !isFiniteNumber(raw.askingHigh) ||
    !isFiniteNumber(raw.askingMedian) ||
    !isFiniteNumber(raw.listingCount) ||
    !isFiniteNumber(raw.daysOnMarket) ||
    !isFiniteNumber(raw.sentimentScore)
  ) {
    throw new Error(`Snapshot ${raw.id} has invalid numbers.`);
  }
  if (!(SENTIMENT_TONES as readonly string[]).includes(String(raw.sentiment))) {
    throw new Error(`Snapshot ${raw.id} has an unknown sentiment.`);
  }
  if (!(TRENDS as readonly string[]).includes(String(raw.trend))) {
    throw new Error(`Snapshot ${raw.id} has an unknown trend.`);
  }
  if (!(PULSE_SOURCES as readonly string[]).includes(String(raw.source))) {
    throw new Error(`Snapshot ${raw.id} has an unknown source.`);
  }
  return {
    id: raw.id,
    vehicleId: raw.vehicleId,
    date: raw.date,
    askingLow: raw.askingLow,
    askingHigh: raw.askingHigh,
    askingMedian: raw.askingMedian,
    soldMedian: raw.soldMedian == null ? null : Number(raw.soldMedian),
    soldCount: isFiniteNumber(raw.soldCount) ? raw.soldCount : 0,
    listingCount: raw.listingCount,
    daysOnMarket: raw.daysOnMarket,
    medianDaysToSale: raw.medianDaysToSale == null || raw.medianDaysToSale === '' ? null : Number(raw.medianDaysToSale),
    sentiment: raw.sentiment,
    sentimentScore: raw.sentimentScore,
    trend: raw.trend,
    headline: isString(raw.headline) ? raw.headline : '',
    brief: isString(raw.brief) ? raw.brief : '',
    source: raw.source as PulseSource,
    needsReview: Boolean(raw.needsReview),
  };
}

function parseComp(raw: unknown): Comp {
  if (!isObject(raw) || !isString(raw.id) || !isVehicleId(raw.vehicleId) || !isString(raw.title)) {
    throw new Error('A comp is missing an id, vehicle, or title.');
  }
  if (!isFiniteNumber(raw.price) || !isFiniteNumber(raw.year)) {
    throw new Error(`Comp ${raw.id} has an invalid price or year.`);
  }
  if (!(COMP_STATUSES as readonly string[]).includes(String(raw.status))) {
    throw new Error(`Comp ${raw.id} has an unknown status.`);
  }
  return {
    id: raw.id,
    vehicleId: raw.vehicleId,
    title: raw.title,
    year: raw.year,
    price: raw.price,
    soldPrice: raw.soldPrice == null || raw.soldPrice === '' ? null : Number(raw.soldPrice),
    miles: raw.miles == null || raw.miles === '' ? null : Number(raw.miles),
    hours: raw.hours == null || raw.hours === '' ? null : Number(raw.hours),
    location: isString(raw.location) ? raw.location : '',
    condition: isString(raw.condition) ? raw.condition : '',
    source: isString(raw.source) ? raw.source : '',
    url: isString(raw.url) ? raw.url : '',
    photo: isString(raw.photo) ? raw.photo : '',
    listedOn: dateOk(raw.listedOn) ? raw.listedOn : '',
    daysListed: raw.daysListed == null || raw.daysListed === '' ? null : Number(raw.daysListed),
    status: raw.status,
    notes: isString(raw.notes) ? raw.notes : '',
  };
}

function parseSentiment(raw: unknown): SentimentNote {
  if (!isObject(raw) || !isString(raw.id) || !isVehicleId(raw.vehicleId) || !dateOk(raw.date)) {
    throw new Error('A sentiment note is missing an id, vehicle, or date.');
  }
  if (!(NOTE_TONES as readonly string[]).includes(String(raw.tone))) {
    throw new Error(`Sentiment ${raw.id} has an unknown tone.`);
  }
  return {
    id: raw.id,
    vehicleId: raw.vehicleId,
    date: raw.date,
    source: isString(raw.source) ? raw.source : '',
    tone: raw.tone,
    summary: isString(raw.summary) ? raw.summary : '',
    url: isString(raw.url) ? raw.url : '',
  };
}

function parseListing(raw: unknown): MarketListing {
  if (!isObject(raw) || !isString(raw.id) || !isVehicleId(raw.vehicleId) || !isString(raw.sourceId)) {
    throw new Error('A market listing is invalid.');
  }
  return {
    id: raw.id,
    vehicleId: raw.vehicleId,
    sourceId: raw.sourceId,
    title: isString(raw.title) ? raw.title : '',
    price: isFiniteNumber(raw.price) ? raw.price : 0,
    miles: raw.miles == null || raw.miles === '' ? null : Number(raw.miles),
    hours: raw.hours == null || raw.hours === '' ? null : Number(raw.hours),
    location: isString(raw.location) ? raw.location : '',
    url: isString(raw.url) ? raw.url : '',
    firstSeen: dateOk(raw.firstSeen) ? raw.firstSeen : '',
    lastSeen: dateOk(raw.lastSeen) ? raw.lastSeen : '',
    source: isString(raw.source) ? raw.source : '',
    status: raw.status === 'gone' ? 'gone' : 'active',
  };
}

export function getVehicle(store: GarageStore, id: string) {
  return store.vehicles.find((vehicle) => vehicle.id === id) ?? null;
}

export function snapshotsFor(store: GarageStore, vehicleId: VehicleId) {
  return store.snapshots
    .filter((item) => item.vehicleId === vehicleId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function latestSnapshot(store: GarageStore, vehicleId: VehicleId) {
  const list = snapshotsFor(store, vehicleId);
  return list.at(-1) ?? null;
}

export function compsFor(store: GarageStore, vehicleId: VehicleId) {
  return store.comps
    .filter((item) => item.vehicleId === vehicleId)
    .sort((a, b) => b.listedOn.localeCompare(a.listedOn) || b.price - a.price);
}

export function sentimentsFor(store: GarageStore, vehicleId: VehicleId) {
  return store.sentiments
    .filter((item) => item.vehicleId === vehicleId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function changeVs(current: number, previous: number | null | undefined) {
  if (previous == null) return null;
  return current - previous;
}

export function previousSnapshot(store: GarageStore, vehicleId: VehicleId) {
  const list = snapshotsFor(store, vehicleId);
  return list.length > 1 ? list[list.length - 2] : null;
}

export function weekAgoSnapshot(store: GarageStore, vehicleId: VehicleId) {
  const latest = latestSnapshot(store, vehicleId);
  if (!latest) return null;
  const target = addDays(latest.date, -7);
  const list = snapshotsFor(store, vehicleId);
  return list.filter((item) => item.date <= target).at(-1) ?? list[0] ?? null;
}

export function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function todayStamp(now = new Date()) {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function upsertSnapshot(store: GarageStore, snapshot: Snapshot): GarageStore {
  const next = cloneStore(store);
  const index = next.snapshots.findIndex((item) => item.id === snapshot.id || (item.vehicleId === snapshot.vehicleId && item.date === snapshot.date));
  if (index >= 0) next.snapshots[index] = snapshot;
  else next.snapshots.push(snapshot);
  next.updatedAt = new Date().toISOString();
  return next;
}

export function removeById<T extends { id: string }>(items: T[], id: string) {
  return items.filter((item) => item.id !== id);
}

export function upsertComp(store: GarageStore, comp: Comp): GarageStore {
  const next = cloneStore(store);
  const index = next.comps.findIndex((item) => item.id === comp.id);
  if (index >= 0) next.comps[index] = comp;
  else next.comps.push(comp);
  next.updatedAt = new Date().toISOString();
  return next;
}

export function deleteComp(store: GarageStore, id: string): GarageStore {
  const next = cloneStore(store);
  next.comps = removeById(next.comps, id);
  next.updatedAt = new Date().toISOString();
  return next;
}

export function upsertSentiment(store: GarageStore, note: SentimentNote): GarageStore {
  const next = cloneStore(store);
  const index = next.sentiments.findIndex((item) => item.id === note.id);
  if (index >= 0) next.sentiments[index] = note;
  else next.sentiments.push(note);
  next.updatedAt = new Date().toISOString();
  return next;
}

export function deleteSentiment(store: GarageStore, id: string): GarageStore {
  const next = cloneStore(store);
  next.sentiments = removeById(next.sentiments, id);
  next.updatedAt = new Date().toISOString();
  return next;
}

export function deleteSnapshot(store: GarageStore, id: string): GarageStore {
  const next = cloneStore(store);
  next.snapshots = removeById(next.snapshots, id);
  next.updatedAt = new Date().toISOString();
  return next;
}

export function updateVehicle(store: GarageStore, vehicle: Vehicle): GarageStore {
  const next = cloneStore(store);
  const index = next.vehicles.findIndex((item) => item.id === vehicle.id);
  if (index < 0) throw new Error('Unknown vehicle.');
  next.vehicles[index] = vehicle;
  next.updatedAt = new Date().toISOString();
  return next;
}

export function carryForwardPulse(
  store: GarageStore,
  vehicleId: VehicleId,
  date: string,
  extras: Partial<Pick<Snapshot, 'headline' | 'brief' | 'source' | 'needsReview'>> = {},
): GarageStore {
  const previous = latestSnapshot(store, vehicleId);
  if (!previous) throw new Error(`No previous snapshot to carry forward for ${vehicleId}.`);
  if (previous.date === date) {
    return upsertSnapshot(store, {
      ...previous,
      source: extras.source ?? previous.source,
      needsReview: extras.needsReview ?? previous.needsReview,
      headline: extras.headline ?? previous.headline,
      brief: extras.brief ?? previous.brief,
    });
  }
  return upsertSnapshot(store, {
    ...previous,
    id: snapshotId(vehicleId, date),
    date,
    source: extras.source ?? 'auto',
    needsReview: extras.needsReview ?? true,
    headline: extras.headline ?? previous.headline,
    brief: extras.brief ?? previous.brief,
  });
}

export function vehiclesIn(store: GarageStore, section: 'cars' | 'rvs') {
  return store.vehicles.filter((vehicle) => (vehicle.kind === 'rv' ? 'rvs' : 'cars') === section);
}
