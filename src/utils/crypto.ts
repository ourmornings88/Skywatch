// Web Crypto API helpers matching app.html crypto architecture

const enc = new TextEncoder();
const dec = new TextDecoder();

export const PIN_LEN = 4;
export const LIC_KEY = '_sw_k';
export const CODES_KEY = '_sw_c';
export const GALLERY_KEY = '_sw_g';

// Unique client identifier
export function getClientID(): string {
  let cid = '';
  try {
    cid = localStorage.getItem('_sw_id') || '';
  } catch {}
  if (!cid) {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    cid = Array.from(array).join('-');
    try {
      localStorage.setItem('_sw_id', cid);
    } catch {}
  }
  return cid;
}

export function b64(buf: ArrayBuffer | Uint8Array): string {
  let s = '';
  new Uint8Array(buf).forEach(b => s += String.fromCharCode(b));
  return btoa(s);
}

export function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

export function hex(buf: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export async function sha256(s: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return hex(digest);
}

export async function hashPin(pin: string): Promise<string> {
  return sha256('skywatch/pin/v1|' + pin);
}

export async function pbkdf2(secret: string, salt: string, iter: number, bits: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt) as unknown as BufferSource, iterations: iter },
    key,
    bits
  );
}

export async function deriveRoom(phrase: string): Promise<{ roomId: string; key: CryptoKey }> {
  const [idBits, keyBits] = await Promise.all([
    pbkdf2(phrase, 'skywatch/room/v1', 100000, 128),
    pbkdf2(phrase, 'skywatch/key/v1', 100000, 256)
  ]);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBits,
    'AES-GCM',
    false,
    ['encrypt', 'decrypt']
  );

  return {
    roomId: hex(idBits),
    key: cryptoKey
  };
}

export async function encryptMsg(key: CryptoKey, obj: Record<string, unknown>): Promise<{ c: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    enc.encode(JSON.stringify(obj))
  );
  return {
    c: b64(encrypted),
    iv: b64(iv)
  };
}

export async function decryptMsg(key: CryptoKey, payload: { c: string; iv: string }): Promise<Record<string, unknown>> {
  const ivArr = unb64(payload.iv);
  const cArr = unb64(payload.c);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivArr as unknown as BufferSource },
    key,
    cArr as unknown as BufferSource
  );
  return JSON.parse(dec.decode(decrypted));
}
