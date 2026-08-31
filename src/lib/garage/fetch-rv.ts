import { decodeHtml, dollarsFrom, fetchText, milesFrom, nearDenverLocation } from './fetch-http.ts';
import { listingAdUrl } from './links.ts';
import type { IncomingListing } from './market.ts';

const FEEDS = [
  'https://denver.craigslist.org/search/rva?query=thor+majestic+28A&format=rss',
  'https://denver.craigslist.org/search/rva?query=majestic+28a&format=rss',
];

/** Public ad pages that have returned 200 from Node. Search homepages stay out. */
const KNOWN_ADS = [
  'https://www.popsells.com/rv-for-sale/2016-thor-motor-coach-majestic-28a-462231',
  'https://rvcrazy.com/rv-for-sale/2016-four-winds-majestic-28a-timnath-co-80547-id256888',
  'https://www.rvparkstore.com/rvs/6808650-2022-28a-majestic-for-sale-in-longmont-co',
  'https://www.rvpark.com/rvs/6808650-2022-28a-majestic-for-sale-in-longmont-co',
  'https://rvs.autotrader.com/rvs/2020/thor/majestic/m_28a/300603863',
  'https://www.rvusa.com/2016-thor-motor-coach-majestic-28a-class-c-4809626',
];

function decode(value: string) {
  return decodeHtml(
    value
      .replace(/<!\[CDATA\[/g, '')
      .replace(/\]\]>/g, '')
      .replace(/\s+/g, ' '),
  );
}

function looksLikeMajestic28A(text: string) {
  const hay = text.toLowerCase();
  const majestic = hay.includes('majestic');
  const floor = hay.includes('28a') || hay.includes('m-28a') || hay.includes('m 28a');
  return majestic && (floor || hay.includes('thor'));
}

function inDenverRadius(value: string) {
  if (!value.trim()) return false;
  if (nearDenverLocation(value)) return true;
  return /fort collins|timnath|frederick|longmont|denver|parker|loveland|greeley|boulder|aurora/i.test(value);
}

export function askingPrice(html: string) {
  const candidates = [
    (html.match(/lis_price"\s*:\s*"(\$[\d,.]+)"/i) ?? [])[1],
    (html.match(/Sale Price\s*\$([0-9,.]+)/i) ?? [])[0],
    (html.match(/Price:\s*<\/[^>]+>\s*(\$[\d,.]+)/i) ?? [])[1],
    (html.match(/Current Asking Price:\s*\$([0-9,.]+)/i) ?? [])[0],
    (html.match(/>(\$[0-9]{2,3},[0-9]{3}(?:\.\d{2})?)</) ?? [])[1],
    (html.match(/\$[0-9]{2,3},[0-9]{3}(?:\.\d{2})?/) ?? [])[0],
  ];
  for (const candidate of candidates) {
    const price = dollarsFrom(candidate);
    if (price >= 5_000) return price;
  }
  return 0;
}

export function listingLocation(html: string, title: string) {
  const city = decode((html.match(/lis_location_city"\s*:\s*"([^"]+)"/i) ?? [])[1] ?? '');
  const state = decode((html.match(/lis_location_state"\s*:\s*"([^"]+)"/i) ?? [])[1] ?? '');
  const fromJson = [city, state].filter(Boolean).join(', ');
  const fromTitle =
    decode((title.match(/\b(?:in|near)\s+([A-Za-z .'-]+,\s*(?:[A-Z]{2}|Colorado|Wyoming))\b/i) ?? [])[1] ?? '') ||
    decode((title.match(/\s[-–]\s+([A-Za-z .'-]+,\s*[A-Z]{2})\b/) ?? [])[1] ?? '');
  return (
    fromJson ||
    fromTitle ||
    decode((html.match(/This RV is located in ([A-Za-z .'-]+,\s*[A-Z]{2})/i) ?? [])[1] ?? '') ||
    decode((html.match(/RV Location<\/td>\s*<td[^>]*>\s*([A-Za-z][^<]+)/i) ?? [])[1] ?? '') ||
    decode((html.match(/for sale near ([A-Za-z .'-]+,\s*[A-Z]{2})/i) ?? [])[1] ?? '') ||
    decode((html.match(/Used Class C in ([A-Za-z .'-]+,\s*[A-Z]{2})/i) ?? [])[1] ?? '') ||
    decode((html.match(/Closest major city is ([A-Za-z .'-]+)/i) ?? [])[1] ?? '')
  );
}

export function listingMiles(html: string) {
  const labeled =
    (html.match(/lis_usage_actual"\s*:\s*"(\d+)"/i) ??
      html.match(/Mileage<\/td>\s*<td[^>]*>\s*([0-9,]+)/i) ??
      html.match(/\bOdometer<\/td>\s*<td[^>]*>\s*([0-9,]+)/i) ??
      [])[1] ?? '';
  // Skip bare "100,000 miles" — Cruise America warranty copy, not an odometer.
  return milesFrom(labeled);
}

export function parseRss(xml: string): IncomingListing[] {
  const items = xml.split(/<item>/i).slice(1);
  const out: IncomingListing[] = [];
  for (const item of items) {
    const title = decode((item.match(/<title>([\s\S]*?)<\/title>/i) ?? [])[1] ?? '');
    const link = decode((item.match(/<link>([\s\S]*?)<\/link>/i) ?? [])[1] ?? '');
    const desc = decode((item.match(/<description>([\s\S]*?)<\/description>/i) ?? [])[1] ?? '');
    if (!looksLikeMajestic28A(`${title} ${desc}`)) continue;
    const price = askingPrice(`${title} ${desc}`);
    if (!link || !title || !listingAdUrl(link)) continue;
    out.push({
      sourceId: link,
      title,
      price,
      miles: null,
      hours: null,
      location: 'Denver Craigslist',
      url: link,
      source: 'Craigslist Denver',
    });
  }
  return out;
}

export function parseRvAdPage(html: string, url: string): IncomingListing | null {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1] ?? '')
    .replace(/\s+\|.*/, '')
    .replace(/\s+-\s+RVs on Autotrader.*/i, '')
    .replace(/\s+\(\s*ID:\s*\d+\s*\)/i, '')
    .replace(/\s+\d{6,}\s*$/, '')
    .trim() || decode((html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ?? [])[1] ?? '');
  const hay = `${title} ${html}`;
  if (!looksLikeMajestic28A(hay)) return null;
  const loc = listingLocation(html, title);
  if (loc && !inDenverRadius(loc)) return null;
  const price = askingPrice(html);
  if (price < 5_000) return null;
  const miles = listingMiles(html);
  const href = listingAdUrl(url);
  if (!href) return null;
  const pathIds = (() => {
    try {
      return new URL(href).pathname.match(/(\d{6,})/g) ?? [];
    } catch {
      return [];
    }
  })();
  const stock =
    (html.match(/Stock\s*#\s*([A-Z0-9-]+)/i) ??
      html.match(/lis_id"\s*:\s*"?(\d+)/i) ??
      html.match(/\b(?:listing id|id):\s*(\d+)/i) ??
      href.match(/-id(\d+)/i) ??
      [])[1] ??
    pathIds.at(-1) ??
    href;
  const source = /popsells\.com/i.test(href)
    ? 'Pop Sells'
    : /rvcrazy\.com/i.test(href)
      ? 'RVCrazy'
      : /rvusa\.com/i.test(href)
        ? 'RVUSA'
        : /autotrader/i.test(href)
          ? 'Autotrader RV'
          : /rvpark/i.test(href)
            ? 'RV Park Store'
            : 'RV listing';
  const location = loc || (inDenverRadius(hay) ? 'Colorado' : '');
  if (!inDenverRadius(location)) return null;
  return {
    sourceId: String(stock),
    title: title.replace(/\s+/g, ' ').slice(0, 120) || 'Thor Majestic 28A',
    price,
    miles,
    hours: null,
    location: location.replace(/\s+/g, ' ').trim(),
    url: href,
    source,
  };
}

async function fetchCraigslist(): Promise<IncomingListing[]> {
  const seen = new Set<string>();
  const out: IncomingListing[] = [];
  let lastError = '';
  for (const feed of FEEDS) {
    const page = await fetchText(feed, { accept: 'application/rss+xml, application/xml, text/xml, */*' });
    if (!page.ok) {
      lastError = `Craigslist RSS returned ${page.status}.`;
      continue;
    }
    for (const listing of parseRss(page.text)) {
      if (seen.has(listing.sourceId)) continue;
      seen.add(listing.sourceId);
      out.push(listing);
    }
  }
  if (out.length === 0) throw new Error(lastError || 'No Denver Craigslist Majestic/28A listings matched.');
  return out;
}

async function fetchPublicRvAds(): Promise<IncomingListing[]> {
  const seen = new Set<string>();
  const out: IncomingListing[] = [];
  const errors: string[] = [];
  for (const url of KNOWN_ADS) {
    try {
      const page = await fetchText(url);
      if (!page.ok) {
        errors.push(`${new URL(url).hostname} returned ${page.status}.`);
        continue;
      }
      const listing = parseRvAdPage(page.text, page.url || url);
      if (!listing || seen.has(listing.sourceId)) continue;
      seen.add(listing.sourceId);
      out.push(listing);
    } catch (err) {
      errors.push(`${new URL(url).hostname} failed (${err instanceof Error ? err.message : 'error'}).`);
    }
  }
  if (out.length === 0) {
    throw new Error(errors[0] || 'No Denver-area Majestic 28A ads loaded.');
  }
  return out;
}

export async function fetchRvListings(): Promise<IncomingListing[]> {
  const errors: string[] = [];
  try {
    const craigslist = await fetchCraigslist();
    if (craigslist.length) return craigslist;
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Craigslist failed.');
  }
  try {
    return await fetchPublicRvAds();
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Public RV ads failed.');
  }
  throw new Error(errors.join(' '));
}
