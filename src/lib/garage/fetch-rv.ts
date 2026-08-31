import type { IncomingListing } from './market.ts';

const FEEDS = [
  'https://denver.craigslist.org/search/rva?query=thor+majestic+28A&format=rss',
  'https://denver.craigslist.org/search/rva?query=majestic+28a&format=rss',
];

function decode(value: string) {
  return value
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x?([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .trim();
}

function parseRss(xml: string): IncomingListing[] {
  const items = xml.split(/<item>/i).slice(1);
  const out: IncomingListing[] = [];
  for (const item of items) {
    const title = decode((item.match(/<title>([\s\S]*?)<\/title>/i) ?? [])[1] ?? '');
    const link = decode((item.match(/<link>([\s\S]*?)<\/link>/i) ?? [])[1] ?? '');
    const desc = decode((item.match(/<description>([\s\S]*?)<\/description>/i) ?? [])[1] ?? '');
    const hay = `${title} ${desc}`.toLowerCase();
    if (!hay.includes('majestic') && !hay.includes('28a') && !hay.includes('thor')) continue;
    const priceMatch = `${title} ${desc}`.match(/\$[\s]*([0-9]{2,3}(?:,[0-9]{3})+)/);
    const price = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : 0;
    if (!link || !title) continue;
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

export async function fetchRvListings(): Promise<IncomingListing[]> {
  const seen = new Set<string>();
  const out: IncomingListing[] = [];
  for (const feed of FEEDS) {
    const res = await fetch(feed, {
      headers: { 'user-agent': 'MileHighFamilyGarage/1.0 (daily Denver RV pulse)' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) continue;
    for (const listing of parseRss(await res.text())) {
      if (seen.has(listing.sourceId)) continue;
      seen.add(listing.sourceId);
      out.push(listing);
    }
  }
  if (out.length === 0) throw new Error('No Denver Craigslist Majestic/28A listings matched.');
  return out;
}
