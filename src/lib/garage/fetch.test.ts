import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dollarsFrom, milesFrom, nearDenverLocation } from './fetch-http.ts';
import { parseCapitalOneDetail, parseCapitalOneSearch } from './fetch-tesla.ts';
import { parseRvAdPage } from './fetch-rv.ts';

describe('garage listing parsers', () => {
  it('keeps Colorado and Cheyenne, drops far cities', () => {
    assert.equal(nearDenverLocation('Colorado Springs, CO'), true);
    assert.equal(nearDenverLocation('Cheyenne, WY'), true);
    assert.equal(nearDenverLocation('Timnath, CO'), true);
    assert.equal(nearDenverLocation('Livonia, MI'), false);
    assert.equal(nearDenverLocation('Las Vegas, NV'), false);
    assert.equal(dollarsFrom('$35,998'), 35998);
    assert.equal(milesFrom('38,646'), 38646);
  });

  it('reads 2024 Model Y Long Range ads from Capital One HTML', () => {
    const search = `
      <a href="/cars/vehicle-details/2024/Tesla/Model+Y/Long+Range/7SAYGDEE2RA234732">2024</a>
      <a href="/cars/vehicle-details/2023/Tesla/Model+Y/Long+Range/7SAYGDEE6PF627150">2023</a>
    `;
    assert.deepEqual(parseCapitalOneSearch(search), ['7SAYGDEE2RA234732']);
    const listing = parseCapitalOneDetail(
      `<title>Used 2024 Tesla Model+Y Long+Range For Sale in COLORADO SPRINGS, CO | Capital One</title>
       <h1>2024 Tesla Model Y Long Range</h1>
       <span>$35,998</span>
       <p>Electric · Used · 38,646 mi.</p>
       {"listPrice":35998}`,
      '7SAYGDEE2RA234732',
    );
    assert.ok(listing);
    assert.equal(listing?.price, 35998);
    assert.equal(listing?.miles, 38646);
    assert.equal(listing?.location, 'COLORADO SPRINGS, CO');
    assert.match(listing?.url ?? '', /7SAYGDEE2RA234732/);
    assert.equal(
      parseCapitalOneDetail(
        `<title>Used 2024 Tesla Model+Y Long+Range For Sale in LEESBURG, VA</title>
         <h1>2024 Tesla Model Y Long Range</h1>{"listPrice":36495}`,
        '7SAYGDEE7RA222429',
      ),
      null,
    );
  });

  it('reads a Majestic 28A ad and rejects out-of-area pages', () => {
    const listing = parseRvAdPage(
      `<title data-next-head="">2016 Majestic 28A for Sale in Timnath, Colorado | Pop Sells</title>
       <script>{"lis_price":"$28,000","lis_usage_actual":"150000"}</script>`,
      'https://www.popsells.com/rv-for-sale/2016-thor-motor-coach-majestic-28a-462231',
    );
    assert.ok(listing);
    assert.equal(listing?.price, 28000);
    assert.equal(listing?.miles, 150000);
    assert.equal(listing?.location, 'Timnath, Colorado');
    assert.equal(listing?.source, 'Pop Sells');
    assert.equal(listing?.sourceId, '462231');
    const longmont = parseRvAdPage(
      `<title>2022 28A MAJESTIC - RV for sale in Longmont, CO 6808650</title>
       <strong>Price:</strong>
       $38,995
       <p>Cruise America THOR Majestic</p>`,
      'https://www.rvparkstore.com/rvs/6808650-2022-28a-majestic-for-sale-in-longmont-co',
    );
    assert.ok(longmont);
    assert.equal(longmont?.price, 38995);
    assert.equal(longmont?.miles, null);
    assert.equal(longmont?.location, 'Longmont, CO');
    assert.equal(longmont?.title, '2022 28A MAJESTIC - RV for sale in Longmont, CO');
    assert.equal(longmont?.source, 'RV Park Store');
    assert.equal(
      parseRvAdPage(
        `<title>2019 Four Winds Majestic 28A</title><p>RV Location</p><td>Livonia, MI</td><p>$35,500</p>`,
        'https://rvcrazy.com/rv-for-sale/2019-four-winds-majestic-28a-livonia-mi-48154-id264876',
      ),
      null,
    );
  });
});
