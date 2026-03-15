#!/usr/bin/env node
// 生成管理员密码的 PBKDF2 哈希并更新远程 D1 数据库
// 用法: node scripts/init-admin-password.mjs [password]
// 默认密码: admin123456

const { webcrypto } = await import('crypto');
const crypto = webcrypto;

const password = process.argv[2] || 'admin123456';
const ITERATIONS = 100_000;

const salt = crypto.getRandomValues(new Uint8Array(16));
const enc = new TextEncoder();
const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
  keyMaterial,
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt']
);
const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
const toB64 = arr => Buffer.from(arr).toString('base64');
const hash = `${ITERATIONS}:${toB64(salt)}:${toB64(raw)}`;

console.log(`Password hash: ${hash}`);
console.log('');
console.log('Run this SQL on remote D1:');
console.log(`  wrangler d1 execute family-menu-db --remote --command="UPDATE users SET password_hash = '${hash}' WHERE id = 'admin001'"`);
