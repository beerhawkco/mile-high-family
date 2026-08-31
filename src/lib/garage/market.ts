import { snapshotId } from './ids.ts';
import { listingAdUrl } from './links.ts';
import type { Comp, GarageStore, MarketListing, Snapshot, Trend, VehicleId } from './types.ts';

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const DENVER_MARKET = {
  center: 'Denver, CO',
  radiusMiles: 250,
  lat: 39.7392,
  lng: -104.9903,
  zip: '80202',
  region: 'CO',
} as const;

export function sectionForKind(kind: 'car' | 'rv' | 'ev') {
  return kind === 'rv' ? 'rvs' : 'cars';
}

export function vehiclePath(kind: 'car' | 'rv' | 'ev', id: string) {
  return `/garage/${sectionForKind(kind)}/${id}/`;
}

export function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

export function daysBetween(start: string, end: string) {
  const a = Date.parse(`${start}T12:00:00Z`);
  const b = Date.parse(`${end}T12:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function trendFromDelta(delta: number | null): Trend {
  if (delta == null) return 'flat';
  if (delta > 250) return 'up';
  if (delta < -250) return 'down';
  return 'flat';
}

export function ourDaysListed(listedOn: string, today: string) {
  if (!listedOn) return null;
  return daysBetween(listedOn, today);
}

export function vsMarket(ourAsk: number | null, market: number | null) {
  if (ourAsk == null || market == null) return null;
  return ourAsk - market;
}

export type IncomingListing = {
  sourceId: string;
  title: string;
  price: number;
  miles: number | null;
  hours: number | null;
  location: string;
  url: string;
  source: string;
};

export function mergeListings(
  existing: MarketListing[],
  incoming: IncomingListing[],
  vehicleId: VehicleId,
  date: string,
): { listings: MarketListing[]; newSales: Comp[] } {
  const kept = existing.filter((item) => item.vehicleId !== vehicleId);
  const prior = existing.filter((item) => item.vehicleId === vehicleId);
  const seen = new Map(incoming.map((item) => [item.sourceId, item]));
  const next: MarketListing[] = [];
  const newSales: Comp[] = [];

  for (const listing of prior) {
    const fresh = seen.get(listing.sourceId);
    if (fresh) {
      next.push({
        ...listing,
        title: fresh.title || listing.title,
        price: fresh.price,
        miles: fresh.miles ?? listing.miles,
        hours: fresh.hours ?? listing.hours,
        location: fresh.location || listing.location,
        url: fresh.url || listing.url,
        lastSeen: date,
        status: 'active',
      });
      seen.delete(listing.sourceId);
    } else if (listing.status === 'active') {
      const days = daysBetween(listing.firstSeen, date);
      next.push({ ...listing, status: 'gone', lastSeen: date });
      if ((days ?? 0) >= 1) {
        newSales.push({
          id: `sale_${listing.sourceId}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 48),
          vehicleId,
          title: listing.title,
          year: 0,
          price: listing.price,
          soldPrice: listing.price,
          miles: listing.miles,
          hours: listing.hours,
          location: listing.location,
          condition: '',
          source: `${listing.source} (left the market)`,
          url: listing.url,
          photo: '',
          listedOn: listing.firstSeen,
          daysListed: days,
          status: 'sold',
          notes: `Inferred sold or pulled after ${days} day${days === 1 ? '' : 's'} listed. Last ask ${listing.price}.`,
        });
      }
    } else {
      next.push(listing);
    }
  }

  for (const fresh of seen.values()) {
    next.push({
      id: `lst_${vehicleId}_${fresh.sourceId}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 56),
      vehicleId,
      sourceId: fresh.sourceId,
      title: fresh.title,
      price: fresh.price,
      miles: fresh.miles,
      hours: fresh.hours,
      location: fresh.location,
      url: fresh.url,
      firstSeen: date,
      lastSeen: date,
      source: fresh.source,
      status: 'active',
    });
  }

  return { listings: [...kept, ...next], newSales };
}

export function snapshotFromMarket(
  store: GarageStore,
  vehicleId: VehicleId,
  date: string,
  extras: Partial<Pick<Snapshot, 'headline' | 'brief' | 'sentiment' | 'sentimentScore' | 'source' | 'needsReview'>> = {},
): Snapshot | null {
  const asks = store.listings
    .filter((item) => item.vehicleId === vehicleId && item.status === 'active')
    .map((item) => item.price);
  const sold = store.comps.filter((item) => item.vehicleId === vehicleId && item.status === 'sold');
  const soldPrices = sold.map((item) => item.soldPrice ?? item.price).filter((value) => value > 0);
  const daysToSale = sold.map((item) => item.daysListed).filter((value): value is number => value != null);
  const activeDays = store.listings
    .filter((item) => item.vehicleId === vehicleId && item.status === 'active')
    .map((item) => daysBetween(item.firstSeen, date))
    .filter((value): value is number => value != null);

  if (asks.length === 0 && soldPrices.length === 0) return null;

  const askingMedian = median(asks) ?? 0;
  const previous = store.snapshots
    .filter((item) => item.vehicleId === vehicleId && item.date < date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);

  return {
    id: snapshotId(vehicleId, date),
    vehicleId,
    date,
    askingLow: asks.length ? Math.min(...asks) : 0,
    askingHigh: asks.length ? Math.max(...asks) : 0,
    askingMedian,
    soldMedian: median(soldPrices),
    soldCount: soldPrices.length,
    listingCount: asks.length,
    daysOnMarket: median(activeDays) ?? 0,
    medianDaysToSale: median(daysToSale),
    sentiment: extras.sentiment ?? previous?.sentiment ?? 'warm',
    sentimentScore: extras.sentimentScore ?? previous?.sentimentScore ?? 0,
    trend: trendFromDelta(previous ? askingMedian - previous.askingMedian : null),
    headline: extras.headline ?? previous?.headline ?? `Denver prices, ${DENVER_MARKET.radiusMiles} miles`,
    brief: extras.brief ?? previous?.brief ?? '',
    source: extras.source ?? 'auto',
    needsReview: extras.needsReview ?? false,
  };
}

export function upsertComps(store: GarageStore, incoming: Comp[]) {
  const next = [...store.comps];
  for (const comp of incoming) {
    const index = next.findIndex((item) => item.id === comp.id);
    if (index >= 0) next[index] = { ...next[index], ...comp };
    else next.push(comp);
  }
  return next;
}

function yearFromTitle(title: string, fallback: number) {
  const match = title.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : fallback;
}

const LIVE_SOURCES = new Set(['Tesla Used', 'Craigslist Denver']);

export function compsFromActiveListings(store: GarageStore, vehicleId: VehicleId): Comp[] {
  const fallbackYear = store.vehicles.find((item) => item.id === vehicleId)?.year ?? new Date().getFullYear();
  return store.listings
    .filter((item) => item.vehicleId === vehicleId && item.status === 'active' && listingAdUrl(item.url))
    .map((item) => ({
      id: `cmp_${item.sourceId}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 48),
      vehicleId,
      title: item.title,
      year: yearFromTitle(item.title, fallbackYear),
      price: item.price,
      soldPrice: null,
      miles: item.miles,
      hours: item.hours,
      location: item.location,
      condition: '',
      source: item.source,
      url: listingAdUrl(item.url),
      photo: '',
      listedOn: item.firstSeen,
      daysListed: null,
      status: 'active',
      notes: '',
    }));
}

export function replaceLiveComps(store: GarageStore, vehicleId: VehicleId, live: Comp[], sales: Comp[]) {
  const kept = store.comps.filter((comp) => {
    if (comp.vehicleId !== vehicleId) return true;
    if (comp.status !== 'active') return true;
    if (LIVE_SOURCES.has(comp.source)) return false;
    return true;
  });
  const extraSales = sales.filter((comp) => listingAdUrl(comp.url) || comp.photo);
  return [...kept, ...live, ...extraSales];
}

export function recentWindow(date: string, days = 90) {
  return addDays(date, -days);
}
