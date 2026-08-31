import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  compsFromActiveListings,
  daysBetween,
  median,
  mergeListings,
  replaceLiveComps,
  snapshotFromMarket,
} from './market.ts';
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
    const store = emptyStore();
    store.listings = [
      {
        id: 'lst_1',
        vehicleId: 'tesla-model-y-lr',
        sourceId: 'vin-1',
        title: '2024 Y LR',
        price: 36000,
        miles: 20000,
        hours: null,
        location: 'Denver, CO',
        url: 'https://www.tesla.com/used/VIN1',
        firstSeen: '2026-08-20',
        lastSeen: '2026-08-31',
        source: 'Tesla Used',
        status: 'active',
      },
      {
        id: 'lst_2',
        vehicleId: 'tesla-model-y-lr',
        sourceId: 'vin-2',
        title: '2024 Y LR',
        price: 38000,
        miles: 12000,
        hours: null,
        location: 'Aurora, CO',
        url: 'https://www.tesla.com/used/VIN2',
        firstSeen: '2026-08-18',
        lastSeen: '2026-08-31',
        source: 'Tesla Used',
        status: 'active',
      },
    ];
    store.comps = [
      {
        id: 'sale_1',
        vehicleId: 'tesla-model-y-lr',
        title: '2024 Y LR sold',
        year: 2024,
        price: 35100,
        soldPrice: 35100,
        miles: 29800,
        hours: null,
        location: 'Longmont, CO',
        condition: '',
        source: 'Tesla Used (left the market)',
        url: 'https://www.tesla.com/used/VIN3',
        photo: '',
        listedOn: '2026-08-11',
        daysListed: 14,
        status: 'sold',
        notes: '',
      },
      {
        id: 'sale_2',
        vehicleId: 'tesla-model-y-lr',
        title: '2024 Y LR sold',
        year: 2024,
        price: 35800,
        soldPrice: 35800,
        miles: 31200,
        hours: null,
        location: 'Colorado Springs, CO',
        condition: '',
        source: 'Tesla Used (left the market)',
        url: 'https://www.tesla.com/used/VIN4',
        photo: '',
        listedOn: '2026-08-16',
        daysListed: 9,
        status: 'sold',
        notes: '',
      },
    ];
    const snap = snapshotFromMarket(store, 'tesla-model-y-lr', '2026-08-31');
    assert.ok(snap);
    assert.ok((snap?.soldMedian ?? 0) > 0);
    assert.ok((snap?.medianDaysToSale ?? 0) >= 9);
    assert.equal(snap?.soldCount, 2);
  });

  it('turns live listings into comps only when they have a real ad url', () => {
    const store = emptyStore();
    store.vehicles = createSeedStore().vehicles;
    store.listings = [
      {
        id: 'lst_good',
        vehicleId: 'tesla-model-y-lr',
        sourceId: '5YJYGDEE1RF123456',
        title: '2024 Tesla Model Y Long Range',
        price: 36450,
        miles: 18400,
        hours: null,
        location: 'Denver, CO',
        url: 'https://www.tesla.com/used/5YJYGDEE1RF123456',
        firstSeen: '2026-08-31',
        lastSeen: '2026-08-31',
        source: 'Tesla Used',
        status: 'active',
      },
      {
        id: 'lst_search',
        vehicleId: 'tesla-model-y-lr',
        sourceId: 'browse',
        title: 'Used Model Y',
        price: 39900,
        miles: 10000,
        hours: null,
        location: 'Denver, CO',
        url: 'https://www.tesla.com/inventory/used/my',
        firstSeen: '2026-08-31',
        lastSeen: '2026-08-31',
        source: 'Tesla Used',
        status: 'active',
      },
    ];
    const live = compsFromActiveListings(store, 'tesla-model-y-lr');
    assert.equal(live.length, 1);
    assert.equal(live[0]?.url, 'https://www.tesla.com/used/5YJYGDEE1RF123456');
    const next = replaceLiveComps(
      { ...store, comps: [{ ...live[0]!, id: 'old', source: 'Tesla Used', url: 'https://www.tesla.com/inventory/used/my' }] },
      'tesla-model-y-lr',
      live,
      [],
    );
    assert.equal(next.length, 1);
    assert.equal(next[0]?.url, 'https://www.tesla.com/used/5YJYGDEE1RF123456');
  });
});
