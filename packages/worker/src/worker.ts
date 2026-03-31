/**
 * Cloudflare Workers entry point.
 * Exports the Hono app as a Workers-compatible fetch handler.
 *
 * Usage:
 *   - Local dev: wrangler dev
 *   - Deploy:    wrangler deploy
 *
 * Environment bindings (D1, R2, secrets) are injected by the Workers runtime.
 * The Hono app reads them from c.env — no adapter wrappers needed.
 */
import app from './index.js';
import { hashPassword } from './utils/password.js';

// D1 migration: apply schema if tables don't exist
async function ensureSchema(env: { DB: any; ADMIN_PASSWORD?: string }) {
  const existing = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  ).first();

  if (existing) return;

  // Schema must be applied via wrangler d1 execute --file=src/db/schema.sql
  // This is a safety check — if tables don't exist, the worker cannot start.
  console.error(
    'Database tables not found. Run: wrangler d1 execute chifan-db --file=packages/worker/src/db/schema.sql'
  );
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    // Inject env bindings so Hono routes can access them via c.env
    return app.fetch(request, env, ctx);
  },
};
