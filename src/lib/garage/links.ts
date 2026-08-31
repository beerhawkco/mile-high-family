import { safePhotoSrc } from './photos.ts';

export function safeHttpUrl(value: string) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.href;
  } catch {
    return '';
  }
}

export function isMarketSearchUrl(value: string) {
  const href = safeHttpUrl(value);
  if (!href) return false;
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const path = url.pathname.toLowerCase();
    if (path.includes('/search')) return true;
    if (host === 'tesla.com' && path.startsWith('/inventory')) return true;
    return false;
  } catch {
    return false;
  }
}

export function listingAdUrl(value: string) {
  const href = safeHttpUrl(value);
  if (!href || isMarketSearchUrl(href)) return '';
  return href;
}

export function marketSearchUrl(vehicleId: 'tesla-model-y-lr' | 'thor-majestic-28a', year?: number) {
  if (vehicleId === 'tesla-model-y-lr') return 'https://www.tesla.com/inventory/used/my';
  const query = [year, 'Thor Majestic 28A'].filter(Boolean).join(' ');
  return `https://denver.craigslist.org/search/rva?query=${encodeURIComponent(query)}`;
}

export function compAdUrl(comp: { url: string; photo?: string }) {
  return listingAdUrl(comp.url) || safePhotoSrc(comp.photo ?? '');
}
