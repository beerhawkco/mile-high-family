const COOKIE = 'mhf-garage';
const MAX_AGE_SEC = 60 * 60 * 24 * 14;

export type Session = {
  user: string;
  exp: number;
};

function bytesToB64(bytes: Uint8Array) {
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

function b64ToBytes(value: string) {
  const bin = atob(value);
  return Uint8Array.from(bin, (char) => char.charCodeAt(0));
}

function utf8(value: string) {
  return new TextEncoder().encode(value);
}

export function safeEqual(left: string, right: string) {
  const a = utf8(left);
  const b = utf8(right);
  const len = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

async function hmac(secret: string, payload: string) {
  const key = await crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, utf8(payload));
  return bytesToB64(new Uint8Array(sig));
}

export async function signSession(secret: string, user: string, now = Date.now()): Promise<string> {
  if (!secret || secret.length < 16) throw new Error('Session secret is too short.');
  const session: Session = { user, exp: now + MAX_AGE_SEC * 1000 };
  const payload = bytesToB64(utf8(JSON.stringify(session)));
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

export async function readSession(secret: string, token: string | null, now = Date.now()): Promise<Session | null> {
  if (!token || !secret) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = await hmac(secret, payload);
  if (!safeEqual(sig, expected)) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(b64ToBytes(payload))) as Session;
    if (!session.user || typeof session.exp !== 'number' || session.exp < now) return null;
    return session;
  } catch {
    return null;
  }
}

export function cookieHeader(token: string, secure: boolean) {
  const parts = [
    `${COOKIE}=${token}`,
    'Path=/',
    `Max-Age=${MAX_AGE_SEC}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookieHeader(secure: boolean) {
  const parts = [`${COOKIE}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function readCookie(header: string | null) {
  if (!header) return null;
  const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  return match ? match.slice(COOKIE.length + 1) : null;
}

export function credentialsOk(env: { adminUser: string; adminPassword: string }, username: string, password: string) {
  if (!env.adminUser || !env.adminPassword) return false;
  return safeEqual(username.trim(), env.adminUser) && safeEqual(password, env.adminPassword);
}
