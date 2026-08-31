import { safePhotoSrc } from './photos.ts';
import type { VehicleId } from './types.ts';

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

export function marketSearchUrl(vehicleId: VehicleId, year?: number) {
  if (vehicleId === 'tesla-model-y-lr') return 'https://www.tesla.com/inventory/used/my';
  const query = [year, 'Thor Majestic 28A'].filter(Boolean).join(' ');
  return `https://denver.craigslist.org/search/rva?query=${encodeURIComponent(query)}`;
}

export function compAdUrl(comp: { url: string; photo?: string; vehicleId: VehicleId; year?: number }) {
  return safeHttpUrl(comp.url) || safePhotoSrc(comp.photo ?? '') || marketSearchUrl(comp.vehicleId, comp.year);
}
