import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signToken } from '../middleware/auth';
import type { Env, D1Database, R2Bucket } from '../env';

const JWT_SECRET = 'test-secret-key-for-testing';

function createMockEnv(): Env {
  const mockBind = vi.fn().mockReturnValue({
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
  });
  return {
    DB: {
      prepare: vi.fn().mockReturnValue({
        bind: mockBind,
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
      }),
      batch: vi.fn().mockResolvedValue([]),
      exec: vi.fn(),
    } as unknown as D1Database,
    PHOTOS: { put: vi.fn(), get: vi.fn(), delete: vi.fn() } as unknown as R2Bucket,
    JWT_SECRET,
    CORS_ORIGIN: 'http://localhost:5173',
  };
}

async function getApp() {
  const { default: app } = await import('../index');
  return app;
}

async function makeAdminToken() {
  return signToken({ sub: 'admin001', username: 'admin', isAdmin: true }, JWT_SECRET);
}

async function makeUserToken() {
  return signToken({ sub: 'user001', username: 'member', isAdmin: false }, JWT_SECRET);
}

describe('Admin Routes - Cooking Methods', () => {
  let env: Env;

  beforeEach(() => {
    vi.resetModules();
    env = createMockEnv();
  });

  it('GET /cooking-methods should require auth', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/cooking-methods', {}, env);
    expect(res.status).toBe(401);
  });

  it('GET /cooking-methods should return list for authenticated user', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/cooking-methods',
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it('POST /cooking-methods should require admin', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/cooking-methods',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '煎' }),
      },
      env,
    );
    expect(res.status).toBe(403);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('POST /cooking-methods should reject empty name', async () => {
    const app = await getApp();
    const token = await makeAdminToken();
    const res = await app.request(
      '/api/v1/cooking-methods',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it('PUT /cooking-methods/:id should require admin', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/cooking-methods/cm1',
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '蒸' }),
      },
      env,
    );
    expect(res.status).toBe(403);
  });

  it('DELETE /cooking-methods/:id should require admin', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/cooking-methods/cm1',
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(res.status).toBe(403);
  });
});

describe('Admin Routes - Tags', () => {
  let env: Env;

  beforeEach(() => {
    vi.resetModules();
    env = createMockEnv();
  });

  it('GET /tags should require auth', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/tags', {}, env);
    expect(res.status).toBe(401);
  });

  it('POST /tags should require admin', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/tags',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '中餐' }),
      },
      env,
    );
    expect(res.status).toBe(403);
  });

  it('POST /tags should reject empty name', async () => {
    const app = await getApp();
    const token = await makeAdminToken();
    const res = await app.request(
      '/api/v1/tags',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it('DELETE /tags/:id should require admin', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/tags/tag1',
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(403);
  });
});

describe('Admin Routes - Ingredients', () => {
  let env: Env;

  beforeEach(() => {
    vi.resetModules();
    env = createMockEnv();
  });

  it('GET /ingredients should require auth', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/ingredients', {}, env);
    expect(res.status).toBe(401);
  });

  it('POST /ingredients should require admin', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/ingredients',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '洋葱', categoryId: 'cat1' }),
      },
      env,
    );
    expect(res.status).toBe(403);
  });

  it('DELETE /ingredients/:id should require admin', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/ingredients/ing1',
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(403);
  });
});

describe('Admin Routes - Ingredient Categories', () => {
  let env: Env;

  beforeEach(() => {
    vi.resetModules();
    env = createMockEnv();
  });

  it('GET /ingredient-categories should require auth', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/ingredient-categories', {}, env);
    expect(res.status).toBe(401);
  });

  it('POST /ingredient-categories should require admin', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/ingredient-categories',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '调味品' }),
      },
      env,
    );
    expect(res.status).toBe(403);
  });

  it('DELETE /ingredient-categories/:id should require admin', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/ingredient-categories/cat1',
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(403);
  });
});

describe('Admin Routes - Users', () => {
  let env: Env;

  beforeEach(() => {
    vi.resetModules();
    env = createMockEnv();
  });

  it('GET /users should require admin', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/users',
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(403);
  });

  it('GET /users should work for admin', async () => {
    const app = await getApp();
    const token = await makeAdminToken();
    const res = await app.request(
      '/api/v1/users',
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it('POST /users should require admin', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/users',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'new', password: '123456', displayName: '新用户' }),
      },
      env,
    );
    expect(res.status).toBe(403);
  });
});

describe('Notification Routes', () => {
  let env: Env;

  beforeEach(() => {
    vi.resetModules();
    env = createMockEnv();
  });

  it('GET /notifications should require auth', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/notifications', {}, env);
    expect(res.status).toBe(401);
  });

  it('GET /notifications should return data for authenticated user', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/notifications',
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it('GET /notifications/unread-count should return count', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    (env.DB.prepare as any).mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 5 }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
      }),
      first: vi.fn().mockResolvedValue({ count: 5 }),
      all: vi.fn().mockResolvedValue({ results: [] }),
      run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
    });
    const res = await app.request(
      '/api/v1/notifications/unread-count',
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it('PUT /notifications/read-all should require auth', async () => {
    const app = await getApp();
    const res = await app.request(
      '/api/v1/notifications/read-all',
      { method: 'PUT' },
      env,
    );
    expect(res.status).toBe(401);
  });

  it('PUT /notifications/:id/read should require auth', async () => {
    const app = await getApp();
    const res = await app.request(
      '/api/v1/notifications/n1/read',
      { method: 'PUT' },
      env,
    );
    expect(res.status).toBe(401);
  });

  it('PUT /notifications/read-all should work for authenticated user', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/notifications/read-all',
      { method: 'PUT', headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });
});

describe('Poll Routes', () => {
  let env: Env;

  beforeEach(() => {
    vi.resetModules();
    env = createMockEnv();
  });

  it('GET /poll should require auth', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/poll', {}, env);
    expect(res.status).toBe(401);
  });

  it('GET /poll should return data for authenticated user', async () => {
    const app = await getApp();
    const token = await makeUserToken();
    const res = await app.request(
      '/api/v1/poll',
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });
});
