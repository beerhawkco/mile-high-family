import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSeedStore } from './seed.ts';
import {
  carryForwardPulse,
  deleteComp,
  latestSnapshot,
  parseStore,
  previousSnapshot,
  upsertComp,
} from './store.ts';
import type { Snapshot } from './types.ts';

function sampleSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    id: 'snp_thor-majestic-28a_2026-08-31',
    vehicleId: 'thor-majestic-28a',
    date: '2026-08-31',
    askingLow: 52000,
    askingHigh: 78000,
    askingMedian: 65000,
    soldMedian: 63000,
    soldCount: 1,
    listingCount: 4,
    daysOnMarket: 40,
    medianDaysToSale: 50,
    sentiment: 'warm',
    sentimentScore: 0,
    trend: 'flat',
    headline: 'Test',
    brief: '',
    source: 'admin',
    needsReview: false,
    ...overrides,
  };
}

describe('garage store', () => {
  it('round-trips the seed store with no invented market rows', () => {
    const seed = createSeedStore();
    const parsed = parseStore(JSON.parse(JSON.stringify(seed)));
    assert.equal(parsed.vehicles.length, 2);
    assert.equal(parsed.snapshots.length, 0);
    assert.equal(parsed.comps.length, 0);
    assert.equal(parsed.sentiments.length, 0);
    assert.equal(parsed.listings.length, 0);
  });

  it('rejects a broken store', () => {
    assert.throws(() => parseStore({ version: 2 }), /wrong version/);
  });

  it('carries yesterday forward into a review pulse', () => {
    const seed = createSeedStore();
    seed.snapshots = [sampleSnapshot()];
    const before = latestSnapshot(seed, 'thor-majestic-28a');
    const next = carryForwardPulse(seed, 'thor-majestic-28a', '2026-09-01', { source: 'auto', needsReview: true });
    const pulse = latestSnapshot(next, 'thor-majestic-28a');
    assert.equal(pulse?.date, '2026-09-01');
    assert.equal(pulse?.askingMedian, before?.askingMedian);
    assert.equal(pulse?.needsReview, true);
    assert.equal(previousSnapshot(next, 'thor-majestic-28a')?.date, '2026-08-31');
  });

  it('upserts and deletes a comp', () => {
    const seed = createSeedStore();
    const added = upsertComp(seed, {
      id: 'cmp_test',
      vehicleId: 'tesla-model-y-lr',
      title: 'Test comp',
      year: 2024,
      price: 36000,
      miles: 20000,
      hours: null,
      location: 'Denver, CO',
      condition: 'Clean',
      source: 'Private',
      url: 'https://www.tesla.com/used/5YJYGDEE1RF123456',
      photo: '',
      listedOn: '2026-08-31',
      daysListed: null,
      soldPrice: null,
      status: 'active',
      notes: '',
    });
    assert.ok(added.comps.some((item) => item.id === 'cmp_test'));
    assert.equal(deleteComp(added, 'cmp_test').comps.some((item) => item.id === 'cmp_test'), false);
  });
});
