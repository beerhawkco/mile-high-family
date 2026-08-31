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

function isLongRange(car: TeslaResult) {
  const trim = `${car.TrimName ?? ''}`.toLowerCase();
  if (trim.includes('long range') || trim.includes('lrawd') || trim === 'lr') return true;
  const codes = (car.OptionCodeData ?? []).map((item) => `${item.code ?? ''} ${item.group ?? ''}`.toLowerCase());
  return codes.some((code) => code.includes('long range') || code.includes('lrawd'));
}

export async function fetchTeslaListings(_date = new Date().toISOString().slice(0, 10)): Promise<IncomingListing[]> {
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
      accept: 'application/json',
      'user-agent': 'MileHighFamilyGarage/1.0 (daily Denver market pulse)',
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
        url: car.VIN ? `https://www.tesla.com/used/${car.VIN}` : 'https://www.tesla.com/inventory/used/my',
        source: 'Tesla Used',
      };
    })
    .filter((item) => item.price > 0);
}
