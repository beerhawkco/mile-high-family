import { carryForwardPulse, latestSnapshot, todayStamp } from './store.ts';
import { VEHICLE_IDS, type GarageStore, type VehicleId } from './types.ts';

export function applyDailyPulse(store: GarageStore, date = todayStamp()): { store: GarageStore; changed: boolean } {
  let next = store;
  let changed = false;
  for (const id of VEHICLE_IDS) {
    const latest = latestSnapshot(next, id);
    if (!latest) continue;
    if (latest.date === date && !latest.needsReview) continue;
    next = carryForwardPulse(next, id as VehicleId, date, {
      source: latest.date === date ? latest.source : 'auto',
      needsReview: true,
      headline: latest.date === date ? latest.headline : `Auto pulse for ${date} — still using ${latest.date} numbers`,
      brief:
        latest.date === date
          ? latest.brief
          : `${latest.brief}\n\nAuto-carried from ${latest.date}. Open the desk and update comps, sentiment, and the asking band.`,
    });
    changed = true;
  }
  if (changed) next.updatedAt = new Date().toISOString();
  return { store: next, changed };
}
