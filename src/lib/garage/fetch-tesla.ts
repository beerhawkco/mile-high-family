import { BROWSER_HEADERS, dollarsFrom, fetchText, milesFrom, nearDenverLocation } from './fetch-http.ts';
import { listingAdUrl } from './links.ts';
import { DENVER_MARKET, type IncomingListing } from './market.ts';

type TeslaResult = {
  VIN?: string;
  TotalPrice?: number;
  Price?: number;
  Year?: number;
  TrimName?: string;
  Odometer?: number;
  City?: string;
  StateProvince?: string;
  OptionCodeData?: { group?: string; code?: string }[];
};

const CAPITAL_ONE_CITIES = [
  'denver-co',
  'aurora-co',
  'colorado-springs-co',
  'loveland-co',
  'parker-co',
  'littleton-co',
  'wheat-ridge-co',
  'cheyenne-wy',
  'fountain-co',
  'greeley-co',
  'fort-collins-co',
  'longmont-co',
  'centennial-co',
  'lakewood-co',
  'boulder-co',
  'pueblo-co',
  'thornton-co',
];

function isLongRange(car: TeslaResult) {
  const trim = `${car.TrimName ?? ''}`.toLowerCase();
  if (trim.includes('long range') || trim.includes('lrawd') || trim === 'lr') return true;
  const codes = (car.OptionCodeData ?? []).map((item) => `${item.code ?? ''} ${item.group ?? ''}`.toLowerCase());
  return codes.some((code) => code.includes('long range') || code.includes('lrawd'));
}

function teslaUsedUrl(vin: string) {
  return `https://www.tesla.com/used/${vin}`;
}

function capitalOneAdUrl(vin: string) {
  return `https://www.capitalone.com/cars/vehicle-details/2024/Tesla/Model+Y/Long+Range/${vin}`;
}

export function parseCapitalOneSearch(html: string) {
  return [...new Set([...html.matchAll(/\/cars\/vehicle-details\/2024\/Tesla\/Model\+Y\/Long\+Range\/([A-Z0-9]{17})/g)].map((m) => m[1]))];
}

export function parseCapitalOneDetail(html: string, vin: string): IncomingListing | null {
  if (!/2024 Tesla Model/i.test(html) || !/long range/i.test(html)) return null;
  const city = decode((html.match(/For Sale in ([A-Za-z .]+,\s*[A-Z]{2})/i) ?? [])[1] ?? '');
  if (!nearDenverLocation(city)) return null;
  const listPrice = Number((html.match(/"listPrice"\s*:\s*([0-9]+)/) ?? [])[1] ?? 0);
  const labeled = dollarsFrom((html.match(/>(\$[0-9]{2,3},[0-9]{3})<\/(?:span|p|div|h1|h2)>/) ?? [])[1] ?? '');
  const price = listPrice >= 10_000 ? listPrice : labeled;
  if (price < 10_000) return null;
  const miles = milesFrom((html.match(/([0-9]{1,3},[0-9]{3})\s*mi\./i) ?? [])[1] ?? '');
  const url = listingAdUrl(capitalOneAdUrl(vin));
  if (!url) return null;
  return {
    sourceId: vin,
    title: `2024 Tesla Model Y Long Range`,
    price,
    miles,
    hours: null,
    location: city.replace(/\s+/g, ' ').replace(/,\s*/, ', '),
    url,
    source: 'Capital One',
  };
}

function decode(value: string) {
  return value.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

async function fetchTeslaInventory(): Promise<IncomingListing[]> {
  const query = {
    query: {
      model: 'my',
      condition: 'used',
      options: {},
      arrangeby: 'Price',
      order: 'asc',
      market: 'US',
      language: 'en',
      super_region: 'north america',
      lng: DENVER_MARKET.lng,
      lat: DENVER_MARKET.lat,
      zip: DENVER_MARKET.zip,
      range: DENVER_MARKET.radiusMiles,
      region: DENVER_MARKET.region,
    },
    offset: 0,
    count: 50,
    outsideOffset: 0,
    outsideSearch: false,
  };
  const url = `https://www.tesla.com/inventory/api/v4/inventory-results?query=${encodeURIComponent(JSON.stringify(query))}`;
  const res = await fetch(url, {
    headers: {
      ...BROWSER_HEADERS,
      accept: 'application/json, text/plain, */*',
      origin: 'https://www.tesla.com',
      referer: 'https://www.tesla.com/inventory/used/my',
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Tesla inventory returned ${res.status}.`);
  const body = (await res.json()) as { results?: TeslaResult[] };
  const results = Array.isArray(body.results) ? body.results : [];
  return results
    .filter((car) => (car.Year ?? 0) === 2024 && isLongRange(car))
    .map((car) => {
      const price = Number(car.TotalPrice ?? car.Price ?? 0);
      const city = [car.City, car.StateProvince].filter(Boolean).join(', ');
      return {
        sourceId: car.VIN || `${car.Year}-${price}-${city}`,
        title: `${car.Year ?? 2024} Tesla Model Y ${car.TrimName ?? 'Long Range'}`,
        price,
        miles: typeof car.Odometer === 'number' ? car.Odometer : null,
        hours: null,
        location: city || 'Denver area',
        url: car.VIN ? teslaUsedUrl(car.VIN) : '',
        source: 'Tesla Used',
      };
    })
    .filter((item) => item.price > 0 && listingAdUrl(item.url));
}

async function fetchCapitalOneListings(): Promise<IncomingListing[]> {
  const vins = new Set<string>();
  const errors: string[] = [];
  for (const city of CAPITAL_ONE_CITIES) {
    const search = `https://www.capitalone.com/cars/used-tesla-model-y/long-range-in-${city}`;
    try {
      const page = await fetchText(search);
      if (!page.ok) {
        errors.push(`Capital One ${city} returned ${page.status}.`);
        continue;
      }
      for (const vin of parseCapitalOneSearch(page.text)) vins.add(vin);
    } catch (err) {
      errors.push(`Capital One ${city} failed (${err instanceof Error ? err.message : 'error'}).`);
    }
  }
  const out: IncomingListing[] = [];
  for (const vin of vins) {
    try {
      const page = await fetchText(capitalOneAdUrl(vin));
      if (!page.ok) continue;
      const listing = parseCapitalOneDetail(page.text, vin);
      if (listing) out.push(listing);
    } catch {
      // skip a single VIN that will not load
    }
  }
  if (out.length === 0) {
    throw new Error(errors[0] || 'No Capital One 2024 Model Y Long Range ads near Denver.');
  }
  return out;
}

export async function fetchTeslaListings(_date = new Date().toISOString().slice(0, 10)): Promise<IncomingListing[]> {
  const errors: string[] = [];
  try {
    const tesla = await fetchTeslaInventory();
    if (tesla.length) return tesla;
    errors.push('Tesla inventory returned no 2024 Long Range ads near Denver.');
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Tesla inventory failed.');
  }
  try {
    return await fetchCapitalOneListings();
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Capital One failed.');
  }
  throw new Error(errors.join(' '));
}
