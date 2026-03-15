/**
 * Node.js server entry point using @hono/node-server.
 * Replaces Cloudflare Workers runtime.
 */
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import app from './index.js';
import { SqliteD1Database } from './adapters/sqlite.js';
import { FileSystemStorage } from './adapters/storage.js';
import { hashPassword } from './utils/password.js';

// --- Configuration ---
const PORT = parseInt(process.env.PORT || '8787', 10);
const DB_PATH = process.env.DB_PATH || './data/family-menu.db';
const PHOTOS_PATH = process.env.PHOTOS_PATH || './data/photos';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const STATIC_DIR = process.env.STATIC_DIR || '../web/dist';

// --- Initialize database ---
const db = new SqliteD1Database(DB_PATH);

// Apply schema if tables don't exist
const schemaPath = resolve(import.meta.dirname!, 'db/schema.sql');
if (existsSync(schemaPath)) {
  const existing = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
  if (!existing) {
    console.log('Applying database schema...');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    // Apply seed data if available
    const seedPath = resolve(import.meta.dirname!, 'db/seed.sql');
    if (existsSync(seedPath)) {
      console.log('Applying seed data...');
      const seed = readFileSync(seedPath, 'utf-8');
      db.exec(seed);
    }
    console.log('Database initialized.');

    // Set admin password (seed.sql has placeholder)
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    const hash = await hashPassword(adminPassword);
    await db.prepare("UPDATE users SET password_hash = ? WHERE id = 'admin001'").bind(hash).run();
    console.log('Admin password initialized.');
  }
}

// --- Initialize photo storage ---
const photos = new FileSystemStorage(PHOTOS_PATH);

// --- Create wrapper app that injects env BEFORE routes ---
const server = new Hono();

// Inject env bindings first (before CORS and routes in sub-app)
server.use('*', async (c, next) => {
  c.env = {
    DB: db as any,
    PHOTOS: photos as any,
    JWT_SECRET,
    CORS_ORIGIN,
  };
  await next();
});

// Photo serving route
server.get('/api/v1/photos/*', async (c) => {
  const key = c.req.path.replace('/api/v1/photos/', '');
  const obj = await photos.get(key);
  if (!obj) return c.json({ error: { code: 'NOT_FOUND', message: '照片不存在' } }, 404);

  const chunks: Uint8Array[] = [];
  const reader = obj.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const buffer = Buffer.concat(chunks);

  return new Response(buffer, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

// Mount the main API app
server.route('/', app);

// Serve static frontend files
const staticRoot = resolve(import.meta.dirname!, STATIC_DIR);
if (existsSync(staticRoot)) {
  server.use('/*', serveStatic({ root: staticRoot }));
  // SPA fallback – serve index.html for non-API, non-file routes
  server.get('*', async (c) => {
    if (c.req.path.startsWith('/api/')) return c.notFound();
    const indexPath = join(staticRoot, 'index.html');
    if (!existsSync(indexPath)) return c.notFound();
    const html = readFileSync(indexPath, 'utf-8');
    return c.html(html);
  });
}

// --- Start server ---
console.log(`Starting server on port ${PORT}...`);
serve({
  fetch: server.fetch,
  port: PORT,
}, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  db.close();
  process.exit(0);
});
