/**
 * 初始化管理员密码的脚本
 * 用法: node --import tsx scripts/init-admin.ts [password]
 * 默认密码: admin123456
 */
import { webcrypto } from 'node:crypto';

// Polyfill for Node.js
const subtle = (webcrypto as unknown as Crypto).subtle;

const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

function arrayToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr));
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH * 8 },
    true,
    ['encrypt']
  );

  const hashBuffer = await subtle.exportKey('raw', key) as ArrayBuffer;
  const hash = new Uint8Array(hashBuffer);

  // 格式必须和 worker 的 password.ts 一致：iterations:salt:hash
  return `${ITERATIONS}:${arrayToBase64(salt)}:${arrayToBase64(hash)}`;
}

async function main() {
  const password = process.argv[2] || 'admin123456';
  const hash = await hashPassword(password);

  console.log('管理员密码 hash 已生成：');
  console.log(hash);
  console.log('');
  console.log('请执行以下 SQL 更新管理员密码：');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE id = 'admin001';`);
  console.log('');
  console.log('使用 wrangler 执行：');
  console.log(`npx wrangler d1 execute family-menu-db --local --command "UPDATE users SET password_hash = '${hash}' WHERE id = 'admin001';"`);
}

main();
