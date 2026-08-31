export const BROWSER_HEADERS = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
} as const;

export async function fetchText(
  url: string,
  extra: HeadersInit = {},
  timeoutMs = 20_000,
): Promise<{ ok: boolean; status: number; url: string; text: string }> {
  const res = await fetch(url, {
    headers: { ...BROWSER_HEADERS, ...extra },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, url: res.url || url, text };
}

export function dollarsFrom(value: string | number | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1_000) return Math.round(value);
  if (typeof value !== 'string') return 0;
  const match = value.replace(/,/g, '').match(/(\d+)(?:\.\d{1,2})?/);
  const amount = match ? Number(match[1]) : 0;
  return Number.isFinite(amount) && amount >= 1_000 ? amount : 0;
}

export function milesFrom(value: string | null | undefined) {
  if (!value) return null;
  const amount = Number(value.replace(/,/g, ''));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/** Colorado plus Cheyenne, WY — inside 250 miles of Denver 80202. */
export function nearDenverLocation(value: string) {
  const text = value.trim();
  if (!text) return false;
  if (/\bcheyenne\b/i.test(text) && /\bwy\b|\bwyoming\b/i.test(text)) return true;
  if (/,?\s*CO\b/i.test(text) || /\bcolorado\b/i.test(text)) return true;
  return false;
}

export function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x?([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .trim();
}
