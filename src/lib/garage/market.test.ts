import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { daysBetween, median, mergeListings, snapshotFromMarket } from './market.ts';
import { createSeedStore } from './seed.ts';
import { emptyStore } from './store.ts';

describe('garage market math', () => {
  it('medians and day counts', () => {
    assert.equal(median([1, 3, 2]), 2);
    assert.equal(median([10, 20]), 15);
    assert.equal(daysBetween('2026-08-01', '2026-08-10'), 9);
  });

  it('turns a disappeared listing into a sold print with days listed', () => {
    const store = emptyStore();
    const first = mergeListings(
      store.listings,
      [
        {
          sourceId: 'vin-1',
          title: '2024 Y LR',
          price: 36000,
          miles: 20000,
          hours: null,
          location: 'Denver, CO',
          url: 'https://example.com/1',
          source: 'Tesla Used',
        },
      ],
      'tesla-model-y-lr',
      '2026-08-01',
    );
    const second = mergeListings(first.listings, [], 'tesla-model-y-lr', '2026-08-12');
    assert.equal(second.newSales.length, 1);
    assert.equal(second.newSales[0]?.daysListed, 11);
    assert.equal(second.newSales[0]?.soldPrice, 36000);
    assert.equal(second.listings[0]?.status, 'gone');
  });

  it('builds a snapshot from asks and sold comps', () => {
    const seed = createSeedStore();
    const snap = snapshotFromMarket(seed, 'tesla-model-y-lr', '2026-08-31');
    assert.ok(snap);
    assert.ok((snap?.soldMedian ?? 0) > 0);
    assert.ok((snap?.medianDaysToSale ?? 0) >= 9);
    assert.equal(snap?.soldCount, 2);
  });
});
