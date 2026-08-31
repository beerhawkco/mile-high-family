import { fetchRvListings } from './fetch-rv.ts';
import { fetchTeslaListings } from './fetch-tesla.ts';
import { mergeListings, snapshotFromMarket, upsertComps, type IncomingListing } from './market.ts';
import { carryForwardPulse, latestSnapshot, todayStamp, upsertSnapshot } from './store.ts';
import type { GarageStore, VehicleId } from './types.ts';

export type MarketFetcher = (vehicleId: VehicleId, date: string) => Promise<IncomingListing[]>;

export const defaultFetchers: Record<VehicleId, MarketFetcher> = {
  'tesla-model-y-lr': async (_id, date) => fetchTeslaListings(date),
  'thor-majestic-28a': async () => fetchRvListings(),
};

function applyFetched(
  store: GarageStore,
  vehicleId: VehicleId,
  incoming: IncomingListing[],
  date: string,
): GarageStore {
  const { listings, newSales } = mergeListings(store.listings, incoming, vehicleId, date);
  const next: GarageStore = {
    ...store,
    listings,
    comps: upsertComps(store, newSales),
    updatedAt: new Date().toISOString(),
  };
  const snapshot = snapshotFromMarket(next, vehicleId, date, {
    source: 'auto',
    needsReview: false,
    headline: `Live ${next.market.radiusMiles}-mile ${next.market.center} pulse`,
    brief: `Automated from ${incoming.length} live listings. Sold median uses confirmed and inferred sales. Review anything that looks like a pulled listing, not a sale.`,
  });
  return snapshot ? upsertSnapshot(next, snapshot) : next;
}

export async function applyDailyPulse(
  store: GarageStore,
  date = todayStamp(),
  fetchers: Partial<Record<VehicleId, MarketFetcher>> = defaultFetchers,
): Promise<{ store: GarageStore; changed: boolean; notes: string[] }> {
  let next = store;
  let changed = false;
  const notes: string[] = [];

  for (const vehicle of store.vehicles) {
    const fetch = fetchers[vehicle.id];
    if (fetch) {
      try {
        const incoming = await fetch(vehicle.id, date);
        next = applyFetched(next, vehicle.id, incoming, date);
        notes.push(`${vehicle.shortName}: ${incoming.length} live listings.`);
        changed = true;
        continue;
      } catch (err) {
        notes.push(
          `${vehicle.shortName}: live fetch failed (${err instanceof Error ? err.message : 'error'}). Carried last numbers forward.`,
        );
      }
    }
    const latest = latestSnapshot(next, vehicle.id);
    if (!latest) continue;
    if (latest.date === date && !latest.needsReview) continue;
    next = carryForwardPulse(next, vehicle.id, date, {
      source: 'auto',
      needsReview: true,
      headline: latest.date === date ? latest.headline : `Auto pulse for ${date} — still using ${latest.date} numbers`,
      brief:
        latest.date === date
          ? latest.brief
          : `${latest.brief}\n\nLive Denver fetch missed. Numbers carried from ${latest.date}.`,
    });
    changed = true;
  }

  if (changed) next.updatedAt = new Date().toISOString();
  return { store: next, changed, notes };
}
