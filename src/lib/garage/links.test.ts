import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compAdUrl, isMarketSearchUrl, listingAdUrl, marketSearchUrl, safeHttpUrl } from './links.ts';

describe('garage listing links', () => {
  it('keeps http(s) listing urls and rejects junk', () => {
    assert.equal(safeHttpUrl('https://denver.craigslist.org/rva/d/example/123.html'), 'https://denver.craigslist.org/rva/d/example/123.html');
    assert.equal(safeHttpUrl('javascript:alert(1)'), '');
    assert.equal(safeHttpUrl('/local'), '');
    assert.equal(safeHttpUrl(''), '');
  });

  it('never treats a search homepage as an ad url', () => {
    assert.equal(isMarketSearchUrl(marketSearchUrl('tesla-model-y-lr')), true);
    assert.equal(isMarketSearchUrl(marketSearchUrl('thor-majestic-28a', 2019)), true);
    assert.equal(listingAdUrl('https://www.tesla.com/inventory/used/my'), '');
    assert.equal(listingAdUrl('https://denver.craigslist.org/search/rva?query=2019%20Thor%20Majestic%2028A'), '');
    assert.equal(listingAdUrl('https://www.tesla.com/used/5YJYGDEE1RF123456'), 'https://www.tesla.com/used/5YJYGDEE1RF123456');
    assert.equal(listingAdUrl('https://denver.craigslist.org/rva/d/example/123.html'), 'https://denver.craigslist.org/rva/d/example/123.html');
  });

  it('links a listing title only to that ad or its photo', () => {
    assert.equal(
      compAdUrl({
        url: 'https://www.tesla.com/used/ABC123',
      }),
      'https://www.tesla.com/used/ABC123',
    );
    assert.equal(
      compAdUrl({ url: '', photo: '/api/garage/photo/pho_aaaaaaaaaaaa' }),
      '/api/garage/photo/pho_aaaaaaaaaaaa',
    );
    assert.equal(compAdUrl({ url: '' }), '');
    assert.equal(compAdUrl({ url: 'https://www.tesla.com/inventory/used/my' }), '');
    assert.equal(compAdUrl({ url: marketSearchUrl('thor-majestic-28a', 2019) }), '');
  });
});
