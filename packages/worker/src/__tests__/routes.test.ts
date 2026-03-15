import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env, D1Database, R2Bucket } from '../env';

// We test the main app's error handler and route wiring
// by importing the full app and making requests with mocked env

function createMockEnv(): Env {
  return {
    DB: {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
        }),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
      }),
      batch: vi.fn().mockResolvedValue([]),
      exec: vi.fn(),
    } as unknown as D1Database,
    PHOTOS: {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    } as unknown as R2Bucket,
    JWT_SECRET: 'test-secret-key-for-testing',
    CORS_ORIGIN: 'http://localhost:5173',
  };
}

describe('Auth Routes', () => {
  let env: Env;

  beforeEach(() => {
    env = createMockEnv();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should reject empty fields', async () => {
      const { default: app } = await import('../index');
      const res = await app.request(
        '/api/v1/auth/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'test' }),
        },
        env,
      );

      expect(res.status).toBe(400);
      const body = await res.json() as { error: { code: string } };
      expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('should reject short passwords', async () => {
      const { default: app } = await import('../index');
      const res = await app.request(
        '/api/v1/auth/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'test',
            email: 'test@test.com',
            password: '12345',
            displayName: '测试',
          }),
        },
        env,
      );

      expect(res.status).toBe(400);
      const body = await res.json() as { error: { message: string } };
      expect(body.error.message).toContain('密码');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should reject empty credentials', async () => {
      const { default: app } = await import('../index');
      const res = await app.request(
        '/api/v1/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        env,
      );

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should reject unauthenticated requests', async () => {
      const { default: app } = await import('../index');
      const res = await app.request('/api/v1/auth/me', {}, env);

      expect(res.status).toBe(401);
      const body = await res.json() as { error: { code: string } };
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject invalid tokens', async () => {
      const { default: app } = await import('../index');
      const res = await app.request(
        '/api/v1/auth/me',
        { headers: { Authorization: 'Bearer invalid-token' } },
        env,
      );

      expect(res.status).toBe(401);
    });
  });
});

describe('Menu Routes - Validation', () => {
  let env: Env;

  beforeEach(() => {
    env = createMockEnv();
  });

  describe('POST /api/v1/menus', () => {
    it('should reject unauthenticated menu creation', async () => {
      const { default: app } = await import('../index');
      const res = await app.request(
        '/api/v1/menus',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'test' }),
        },
        env,
      );

      expect(res.status).toBe(401);
    });
  });
});

describe('App infrastructure', () => {
  let env: Env;

  beforeEach(() => {
    env = createMockEnv();
  });

  describe('Health check', () => {
    it('GET /api/v1/health should return ok', async () => {
      const { default: app } = await import('../index');
      const res = await app.request('/api/v1/health', {}, env);

      expect(res.status).toBe(200);
      const body = await res.json() as { status: string };
      expect(body.status).toBe('ok');
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const { default: app } = await import('../index');
      const res = await app.request('/api/v1/nonexistent', {}, env);

      expect(res.status).toBe(404);
      const body = await res.json() as { error: { code: string } };
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Dishes routes require auth', () => {
    it('GET /api/v1/dishes should require auth', async () => {
      const { default: app } = await import('../index');
      const res = await app.request('/api/v1/dishes', {}, env);

      expect(res.status).toBe(401);
    });

    it('POST /api/v1/dishes should require auth', async () => {
      const { default: app } = await import('../index');
      const res = await app.request(
        '/api/v1/dishes',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'test' }),
        },
        env,
      );

      expect(res.status).toBe(401);
    });
  });

  describe('Notification routes require auth', () => {
    it('GET /api/v1/notifications should require auth', async () => {
      const { default: app } = await import('../index');
      const res = await app.request('/api/v1/notifications', {}, env);

      expect(res.status).toBe(401);
    });
  });
});
