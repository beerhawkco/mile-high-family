import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSeedStore } from './seed.ts';
import {
  carryForwardPulse,
  deleteComp,
  latestSnapshot,
  parseStore,
  previousSnapshot,
  snapshotsFor,
  upsertComp,
} from './store.ts';

describe('garage store', () => {
  it('round-trips the seed store', () => {
    const seed = createSeedStore();
    const parsed = parseStore(JSON.parse(JSON.stringify(seed)));
    assert.equal(parsed.vehicles.length, 2);
    assert.ok(parsed.snapshots.length >= 20);
    assert.equal(latestSnapshot(parsed, 'tesla-model-y-lr')?.date, '2026-08-31');
    assert.equal(parsed.comps.length, 0);
  });

  it('rejects a broken store', () => {
    assert.throws(() => parseStore({ version: 2 }), /wrong version/);
  });

  it('tracks a downtrend on the seeded Tesla', () => {
    const seed = createSeedStore();
    const latest = latestSnapshot(seed, 'tesla-model-y-lr');
    const first = snapshotsFor(seed, 'tesla-model-y-lr')[0];
    assert.ok(latest && first);
    assert.ok(latest.askingMedian < first.askingMedian);
    assert.equal(latest.trend, 'down');
  });

  it('carries yesterday forward into a review pulse', () => {
    const seed = createSeedStore();
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
      url: '',
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
