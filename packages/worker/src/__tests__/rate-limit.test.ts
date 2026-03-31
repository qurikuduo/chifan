import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { rateLimiter } from '../middleware/rate-limit';
import type { Env } from '../env';

// Helper to create a minimal Hono app with rate limiter
function createApp(opts: { windowMs: number; max: number; keyPrefix?: string }) {
  const app = new Hono<{ Bindings: Env }>();
  app.use('/*', rateLimiter(opts));
  app.get('/test', (c) => c.json({ ok: true }));
  return app;
}

function makeReq(ip = '127.0.0.1') {
  return new Request('http://localhost/test', {
    headers: { 'x-forwarded-for': ip },
  });
}

describe('Rate Limiter Middleware', () => {
  // Each test uses unique keyPrefix to avoid cross-test pollution via shared store
  let counter = 0;
  function uniquePrefix() {
    return `test-${Date.now()}-${counter++}`;
  }

  describe('basic rate limiting', () => {
    it('should allow requests under the limit', async () => {
      const app = createApp({ windowMs: 60_000, max: 5, keyPrefix: uniquePrefix() });
      const res = await app.request(makeReq());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ ok: true });
    });

    it('should return 429 after exceeding the limit', async () => {
      const prefix = uniquePrefix();
      const app = createApp({ windowMs: 60_000, max: 3, keyPrefix: prefix });
      const ip = `exceed-${prefix}`;

      // Use up all 3 allowed requests
      for (let i = 0; i < 3; i++) {
        const res = await app.request(makeReq(ip));
        expect(res.status).toBe(200);
      }

      // 4th request should be blocked
      const res = await app.request(makeReq(ip));
      expect(res.status).toBe(429);
      const body = await res.json() as any;
      expect(body.error.code).toBe('RATE_LIMITED');
    });

    it('should continue blocking until window resets', async () => {
      const prefix = uniquePrefix();
      const app = createApp({ windowMs: 60_000, max: 1, keyPrefix: prefix });
      const ip = `block-${prefix}`;

      await app.request(makeReq(ip)); // 1st → 200
      const r2 = await app.request(makeReq(ip)); // 2nd → 429
      expect(r2.status).toBe(429);
      const r3 = await app.request(makeReq(ip)); // 3rd → still 429
      expect(r3.status).toBe(429);
    });
  });

  describe('rate limit headers', () => {
    it('should set X-RateLimit-Limit header', async () => {
      const app = createApp({ windowMs: 60_000, max: 50, keyPrefix: uniquePrefix() });
      const res = await app.request(makeReq());
      expect(res.headers.get('X-RateLimit-Limit')).toBe('50');
    });

    it('should set X-RateLimit-Remaining header correctly', async () => {
      const prefix = uniquePrefix();
      const app = createApp({ windowMs: 60_000, max: 5, keyPrefix: prefix });
      const ip = `remain-${prefix}`;

      const r1 = await app.request(makeReq(ip));
      expect(r1.headers.get('X-RateLimit-Remaining')).toBe('4');

      const r2 = await app.request(makeReq(ip));
      expect(r2.headers.get('X-RateLimit-Remaining')).toBe('3');
    });

    it('should set X-RateLimit-Reset header as seconds timestamp', async () => {
      const app = createApp({ windowMs: 60_000, max: 10, keyPrefix: uniquePrefix() });
      const res = await app.request(makeReq());
      const reset = Number(res.headers.get('X-RateLimit-Reset'));
      expect(reset).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should set Retry-After header on 429 response', async () => {
      const prefix = uniquePrefix();
      const app = createApp({ windowMs: 60_000, max: 1, keyPrefix: prefix });
      const ip = `retry-${prefix}`;

      await app.request(makeReq(ip)); // 1st
      const res = await app.request(makeReq(ip)); // 2nd → 429
      expect(res.status).toBe(429);
      const retryAfter = Number(res.headers.get('Retry-After'));
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });

    it('should show remaining=0 when exactly at limit', async () => {
      const prefix = uniquePrefix();
      const app = createApp({ windowMs: 60_000, max: 2, keyPrefix: prefix });
      const ip = `exact-${prefix}`;

      await app.request(makeReq(ip));
      const r2 = await app.request(makeReq(ip));
      expect(r2.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(r2.status).toBe(200); // exactly at limit should still pass
    });
  });

  describe('IP-based keying', () => {
    it('should track different IPs separately', async () => {
      const prefix = uniquePrefix();
      const app = createApp({ windowMs: 60_000, max: 1, keyPrefix: prefix });

      const r1 = await app.request(makeReq(`ip-a-${prefix}`));
      const r2 = await app.request(makeReq(`ip-b-${prefix}`));

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
    });

    it('should use first IP from x-forwarded-for chain', async () => {
      const prefix = uniquePrefix();
      const app = createApp({ windowMs: 60_000, max: 1, keyPrefix: prefix });
      const ip = `chain-${prefix}`;

      const req1 = new Request('http://localhost/test', {
        headers: { 'x-forwarded-for': `${ip}, 10.0.0.1, 10.0.0.2` },
      });
      const req2 = new Request('http://localhost/test', {
        headers: { 'x-forwarded-for': `${ip}, 192.168.1.1` },
      });

      const r1 = await app.request(req1);
      expect(r1.status).toBe(200);
      const r2 = await app.request(req2);
      expect(r2.status).toBe(429); // same first IP
    });

    it('should fall back to x-real-ip if x-forwarded-for absent', async () => {
      const prefix = uniquePrefix();
      const app = createApp({ windowMs: 60_000, max: 1, keyPrefix: prefix });
      const ip = `real-${prefix}`;

      const req1 = new Request('http://localhost/test', {
        headers: { 'x-real-ip': ip },
      });
      const req2 = new Request('http://localhost/test', {
        headers: { 'x-real-ip': ip },
      });

      const r1 = await app.request(req1);
      expect(r1.status).toBe(200);
      const r2 = await app.request(req2);
      expect(r2.status).toBe(429);
    });

    it('should use "unknown" when no IP headers present', async () => {
      const prefix = uniquePrefix();
      const app = createApp({ windowMs: 60_000, max: 1, keyPrefix: prefix });

      const req1 = new Request('http://localhost/test');
      const req2 = new Request('http://localhost/test');

      const r1 = await app.request(req1);
      expect(r1.status).toBe(200);
      const r2 = await app.request(req2);
      expect(r2.status).toBe(429);
    });
  });

  describe('window reset', () => {
    it('should reset count after window expires', async () => {
      vi.useFakeTimers();
      try {
        const prefix = uniquePrefix();
        const app = createApp({ windowMs: 1_000, max: 1, keyPrefix: prefix });
        const ip = `reset-${prefix}`;

        const r1 = await app.request(makeReq(ip));
        expect(r1.status).toBe(200);

        const r2 = await app.request(makeReq(ip));
        expect(r2.status).toBe(429);

        // Advance time past window
        vi.advanceTimersByTime(1_100);

        const r3 = await app.request(makeReq(ip));
        expect(r3.status).toBe(200);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should track a new window after reset', async () => {
      vi.useFakeTimers();
      try {
        const prefix = uniquePrefix();
        const app = createApp({ windowMs: 500, max: 2, keyPrefix: prefix });
        const ip = `newwin-${prefix}`;

        await app.request(makeReq(ip));
        await app.request(makeReq(ip));
        const blocked = await app.request(makeReq(ip));
        expect(blocked.status).toBe(429);

        vi.advanceTimersByTime(600);

        // New window — should get full quota
        const r1 = await app.request(makeReq(ip));
        expect(r1.status).toBe(200);
        expect(r1.headers.get('X-RateLimit-Remaining')).toBe('1');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('different key prefixes', () => {
    it('should isolate limits by prefix', async () => {
      const p1 = uniquePrefix();
      const p2 = uniquePrefix();
      const app1 = createApp({ windowMs: 60_000, max: 1, keyPrefix: p1 });
      const app2 = createApp({ windowMs: 60_000, max: 1, keyPrefix: p2 });
      const ip = '10.10.10.10';

      // Both should allow 1 request for same IP
      const r1 = await app1.request(makeReq(ip));
      const r2 = await app2.request(makeReq(ip));
      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
    });
  });

  describe('429 response body', () => {
    it('should return error code RATE_LIMITED', async () => {
      const prefix = uniquePrefix();
      const app = createApp({ windowMs: 60_000, max: 1, keyPrefix: prefix });
      const ip = `body-${prefix}`;

      await app.request(makeReq(ip));
      const res = await app.request(makeReq(ip));
      const body = await res.json() as any;
      expect(body).toEqual({
        error: {
          code: 'RATE_LIMITED',
          message: '请求过于频繁，请稍后再试',
        },
      });
    });

    it('should return application/json content type on 429', async () => {
      const prefix = uniquePrefix();
      const app = createApp({ windowMs: 60_000, max: 1, keyPrefix: prefix });
      const ip = `ct-${prefix}`;

      await app.request(makeReq(ip));
      const res = await app.request(makeReq(ip));
      expect(res.headers.get('content-type')).toContain('application/json');
    });
  });
});
