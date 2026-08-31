export const PHOTO_MAX_BYTES = 4_000_000;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function isPhotoId(id: string) {
  return /^pho_[a-f0-9]{12}$/.test(id);
}

export function photoPath(id: string) {
  return `/api/garage/photo/${id}`;
}

export function safePhotoSrc(value: string) {
  if (!value) return '';
  if (isPhotoId(value.replace('/api/garage/photo/', ''))) return value;
  if (/^https:\/\//i.test(value)) return value;
  return '';
}

export function sniffType(file: { type?: string; name?: string }) {
  if (file.type && (PHOTO_TYPES as readonly string[]).includes(file.type)) return file.type;
  const name = (file.name ?? '').toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  return '';
}

export function bytesToBase64(bytes: Uint8Array) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function base64ToBytes(data: string) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(data, 'base64'));
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export type StoredPhoto = {
  type: string;
  data: string;
};

export function encodePhoto(bytes: Uint8Array, type: string) {
  return JSON.stringify({ type, data: bytesToBase64(bytes) } satisfies StoredPhoto);
}

export function decodePhoto(raw: unknown): { bytes: Uint8Array; type: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as StoredPhoto;
  if (typeof record.data !== 'string' || typeof record.type !== 'string') return null;
  if (!(PHOTO_TYPES as readonly string[]).includes(record.type)) return null;
  return { bytes: base64ToBytes(record.data), type: record.type };
}
