// 密码哈希工具 - 使用 Web Crypto API（Cloudflare Workers 兼容）
// 采用 PBKDF2 算法

const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await deriveKey(password, salt);
  const hashBuffer = await crypto.subtle.exportKey('raw', key) as ArrayBuffer;
  const hash = new Uint8Array(hashBuffer);

  // 格式：iterations:salt:hash（base64编码）
  return `${ITERATIONS}:${arrayToBase64(salt)}:${arrayToBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [iterStr, saltB64, hashB64] = stored.split(':');
  const iterations = parseInt(iterStr, 10);
  const salt = base64ToArray(saltB64);
  const expectedHash = base64ToArray(hashB64);

  const key = await deriveKey(password, salt, iterations);
  const hashBuffer = await crypto.subtle.exportKey('raw', key) as ArrayBuffer;
  const actualHash = new Uint8Array(hashBuffer);

  return timingSafeEqual(expectedHash, actualHash);
}

async function deriveKey(password: string, salt: Uint8Array, iterations = ITERATIONS): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH * 8 },
    true,
    ['encrypt']
  );
}

function arrayToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr));
}

function base64ToArray(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return arr;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}
