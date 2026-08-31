import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compAdUrl, marketSearchUrl, safeHttpUrl } from './links.ts';

describe('garage listing links', () => {
  it('keeps http(s) listing urls and rejects junk', () => {
    assert.equal(safeHttpUrl('https://denver.craigslist.org/rva/d/example/123.html'), 'https://denver.craigslist.org/rva/d/example/123.html');
    assert.equal(safeHttpUrl('javascript:alert(1)'), '');
    assert.equal(safeHttpUrl('/local'), '');
    assert.equal(safeHttpUrl(''), '');
  });

  it('always returns an ad url for a comp', () => {
    assert.equal(
      compAdUrl({
        url: 'https://www.tesla.com/used/ABC123',
        vehicleId: 'tesla-model-y-lr',
        year: 2024,
      }),
      'https://www.tesla.com/used/ABC123',
    );
    assert.equal(
      compAdUrl({ url: '', photo: '/api/garage/photo/pho_aaaaaaaaaaaa', vehicleId: 'tesla-model-y-lr' }),
      '/api/garage/photo/pho_aaaaaaaaaaaa',
    );
    assert.equal(compAdUrl({ url: '', vehicleId: 'tesla-model-y-lr', year: 2024 }), marketSearchUrl('tesla-model-y-lr'));
    assert.match(compAdUrl({ url: '', vehicleId: 'thor-majestic-28a', year: 2019 }), /craigslist\.org/);
  });
});
