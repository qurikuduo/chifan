import type { Context, Next } from 'hono';
import type { Env } from '../env.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store — sufficient for single-instance deployments
const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  windowMs: number;   // Time window in ms
  max: number;        // Max requests per window
  keyPrefix?: string; // Prefix for the key (to separate limits)
}

function getClientKey(c: Context<{ Bindings: Env }>, prefix: string): string {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || 'unknown';
  return `${prefix}:${ip}`;
}

export function rateLimiter(opts: RateLimitOptions) {
  const { windowMs, max, keyPrefix = 'rl' } = opts;

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const key = getClientKey(c, keyPrefix);
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, max - entry.count);
    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json(
        { error: { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后再试' } },
        429,
      );
    }

    await next();
  };
}

// Presets
/** General API: 100 requests per minute */
export const apiLimiter = rateLimiter({ windowMs: 60_000, max: 100, keyPrefix: 'api' });

/** Auth endpoints (login/register): 10 per minute */
export const authLimiter = rateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'auth' });

/** File upload: 20 per minute */
export const uploadLimiter = rateLimiter({ windowMs: 60_000, max: 20, keyPrefix: 'upload' });
