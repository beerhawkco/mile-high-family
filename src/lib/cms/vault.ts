export type VaultBlob = {
  v: 1;
  salt: string;
  iv: string;
  data: string;
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

async function deriveKey(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 210_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function sealToken(password: string, token: string): Promise<VaultBlob> {
  if (password.length < 10) {
    throw new Error('Choose a password that is at least 10 characters.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(token),
  );
  return { v: 1, salt: bytesToB64(salt), iv: bytesToB64(iv), data: bytesToB64(new Uint8Array(cipher)) };
}

export async function unsealToken(password: string, vault: VaultBlob) {
  const key = await deriveKey(password, b64ToBytes(vault.salt));
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64ToBytes(vault.iv) },
      key,
      b64ToBytes(vault.data),
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new Error('That password does not unlock this device.');
  }
}

export function readVault(storage: Pick<Storage, 'getItem'>): VaultBlob | null {
  const raw = storage.getItem('mhf-cairn-vault');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as VaultBlob;
    if (parsed?.v !== 1 || !parsed.salt || !parsed.iv || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeVault(storage: Pick<Storage, 'setItem'>, vault: VaultBlob) {
  storage.setItem('mhf-cairn-vault', JSON.stringify(vault));
}

export function clearVault(storage: Pick<Storage, 'removeItem'>) {
  storage.removeItem('mhf-cairn-vault');
}
