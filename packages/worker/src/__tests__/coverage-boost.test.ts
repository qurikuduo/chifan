/**
 * Additional route integration tests for coverage gaps:
 * - Tags CRUD (GET/PUT/DELETE with existing items)
 * - Ingredients search/grouped + CRUD
 * - Ingredient categories CRUD
 * - Users password management
 * - Poll with since parameter
 * - Menu invitees/collaborators
 * - Auth input validation
 * - Storage adapter
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, createTestStorage, seedUser, seedCategory } from './helpers/test-db.js';
import { SqliteD1Database } from '../adapters/sqlite.js';
import { FileSystemStorage } from '../adapters/storage.js';
import { signToken } from '../middleware/auth.js';
import type { Env } from '../env.js';

const JWT_SECRET = 'test-coverage-secret';

async function createEnv(db: SqliteD1Database, storage?: any): Promise<Env> {
  return {
    DB: db as any,
    PHOTOS: storage ?? { put: async () => {}, get: async () => null, delete: async () => {} } as any,
    JWT_SECRET,
    CORS_ORIGIN: '*',
  };
}

async function getToken(userId: string, username: string, isAdmin = false) {
  return signToken({ sub: userId, username, isAdmin }, JWT_SECRET);
}

async function getApp() {
  const mod = await import('../index.js');
  return mod.default;
}

describe('Coverage - Tags full CRUD', () => {
  let db: SqliteD1Database;
  let env: Env;
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
    const adminId = await seedUser(db, { username: 'admin', isAdmin: true });
    adminToken = await getToken(adminId, 'admin', true);
    const userId = await seedUser(db, { username: 'user' });
    userToken = await getToken(userId, 'user');
  });

  it('GET /tags should list tags for regular user', async () => {
    await db.prepare("INSERT INTO tags (id, name) VALUES ('t1', '家常菜')").run();
    const app = await getApp();
    const res = await app.request('/api/v1/tags', { headers: { Authorization: `Bearer ${userToken}` } }, env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it('PUT /tags/:id should update tag', async () => {
    await db.prepare("INSERT INTO tags (id, name) VALUES ('t1', '家常菜')").run();
    const app = await getApp();
    const res = await app.request('/api/v1/tags/t1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: '私房菜' }),
    }, env);
    expect(res.status).toBe(200);
  });

  it('DELETE /tags/:id should delete tag', async () => {
    await db.prepare("INSERT INTO tags (id, name) VALUES ('t1', '家常菜')").run();
    const app = await getApp();
    const res = await app.request('/api/v1/tags/t1', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, env);
    expect(res.status).toBe(200);
  });
});

describe('Coverage - Ingredients full CRUD', () => {
  let db: SqliteD1Database;
  let env: Env;
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
    const adminId = await seedUser(db, { username: 'admin', isAdmin: true });
    adminToken = await getToken(adminId, 'admin', true);
    const userId = await seedUser(db, { username: 'user' });
    userToken = await getToken(userId, 'user');
  });

  it('GET /ingredients should search', async () => {
    const catId = await seedCategory(db, '蔬菜类');
    await db.prepare("INSERT INTO ingredients (id, name, category_id) VALUES ('i1', '白菜', ?)").bind(catId).run();
    const app = await getApp();
    const res = await app.request('/api/v1/ingredients?keyword=白', { headers: { Authorization: `Bearer ${userToken}` } }, env);
    expect(res.status).toBe(200);
  });

  it('GET /ingredients/grouped should return grouped result', async () => {
    const catId = await seedCategory(db, '蔬菜类');
    await db.prepare("INSERT INTO ingredients (id, name, category_id) VALUES ('i1', '白菜', ?)").bind(catId).run();
    const app = await getApp();
    const res = await app.request('/api/v1/ingredients/grouped', { headers: { Authorization: `Bearer ${userToken}` } }, env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(Array.isArray(body)).toBe(true);
  });

  it('PUT /ingredients/:id should update', async () => {
    const catId = await seedCategory(db, '蔬菜类');
    await db.prepare("INSERT INTO ingredients (id, name, category_id) VALUES ('i1', '白菜', ?)").bind(catId).run();
    const app = await getApp();
    const res = await app.request('/api/v1/ingredients/i1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: '大白菜' }),
    }, env);
    expect(res.status).toBe(200);
  });

  it('DELETE /ingredients/:id should delete', async () => {
    const catId = await seedCategory(db, '蔬菜类');
    await db.prepare("INSERT INTO ingredients (id, name, category_id) VALUES ('i1', '白菜', ?)").bind(catId).run();
    const app = await getApp();
    const res = await app.request('/api/v1/ingredients/i1', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, env);
    expect(res.status).toBe(200);
  });
});

describe('Coverage - Ingredient Categories full CRUD', () => {
  let db: SqliteD1Database;
  let env: Env;
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
    const adminId = await seedUser(db, { username: 'admin', isAdmin: true });
    adminToken = await getToken(adminId, 'admin', true);
    const userId = await seedUser(db, { username: 'user' });
    userToken = await getToken(userId, 'user');
  });

  it('GET /ingredient-categories should list', async () => {
    await seedCategory(db, '蔬菜类');
    const app = await getApp();
    const res = await app.request('/api/v1/ingredient-categories', { headers: { Authorization: `Bearer ${userToken}` } }, env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it('PUT /ingredient-categories/:id should update', async () => {
    const catId = await seedCategory(db, '蔬菜类');
    const app = await getApp();
    const res = await app.request(`/api/v1/ingredient-categories/${catId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: '肉类' }),
    }, env);
    expect(res.status).toBe(200);
  });

  it('DELETE /ingredient-categories/:id should delete', async () => {
    const catId = await seedCategory(db, '蔬菜类');
    const app = await getApp();
    const res = await app.request(`/api/v1/ingredient-categories/${catId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, env);
    expect(res.status).toBe(200);
  });
});

describe('Coverage - Users password routes', () => {
  let db: SqliteD1Database;
  let env: Env;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
  });

  it('PUT /users/me/password should change password', async () => {
    const { hashPassword } = await import('../utils/password.js');
    const hash = await hashPassword('oldpass123');
    const userId = await seedUser(db, { username: 'user1', passwordHash: hash });
    const token = await getToken(userId, 'user1');

    const app = await getApp();
    const res = await app.request('/api/v1/users/me/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ oldPassword: 'oldpass123', newPassword: 'newpass123' }),
    }, env);
    expect(res.status).toBe(200);
  });

  it('PUT /users/:id/reset-password should reset (admin)', async () => {
    const adminId = await seedUser(db, { username: 'admin', isAdmin: true });
    const adminToken = await getToken(adminId, 'admin', true);
    const userId = await seedUser(db, { username: 'target' });

    const app = await getApp();
    const res = await app.request(`/api/v1/users/${userId}/reset-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ newPassword: 'resetpass123' }),
    }, env);
    expect(res.status).toBe(200);
  });

  it('GET /users/family-members should return approved members', async () => {
    await seedUser(db, { username: 'member1', displayName: '爸爸', status: 'approved' });
    const userId = await seedUser(db, { username: 'me' });
    const token = await getToken(userId, 'me');

    const app = await getApp();
    const res = await app.request('/api/v1/users/family-members', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it('PUT /users/:id should allow self-update', async () => {
    const userId = await seedUser(db, { username: 'me' });
    const token = await getToken(userId, 'me');

    const app = await getApp();
    const res = await app.request(`/api/v1/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ displayName: '新名字' }),
    }, env);
    expect(res.status).toBe(200);
  });

  it('PUT /users/:id should reject non-self non-admin update', async () => {
    const otherId = await seedUser(db, { username: 'other' });
    const userId = await seedUser(db, { username: 'me' });
    const token = await getToken(userId, 'me');

    const app = await getApp();
    const res = await app.request(`/api/v1/users/${otherId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ displayName: '新名字' }),
    }, env);
    expect(res.status).toBe(403);
  });
});

describe('Coverage - Poll with since param', () => {
  let db: SqliteD1Database;
  let env: Env;
  let token: string;
  let userId: string;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
    userId = await seedUser(db, { username: 'poller' });
    token = await getToken(userId, 'poller');
  });

  it('GET /poll?since should return notifications since timestamp', async () => {
    await db.prepare("INSERT INTO notifications (id, user_id, type, title) VALUES ('n1', ?, 'menu_published', '新菜单')").bind(userId).run();

    const app = await getApp();
    const since = new Date(Date.now() - 86400000).toISOString();
    const res = await app.request(`/api/v1/poll?since=${encodeURIComponent(since)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body).toHaveProperty('notifications');
    expect(body).toHaveProperty('unreadCount');
    expect(body).toHaveProperty('serverTime');
    expect(body.notifications.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Coverage - Menu invitees and collaborators', () => {
  let db: SqliteD1Database;
  let env: Env;
  let creatorId: string;
  let inviteeId: string;
  let collaboratorId: string;
  let creatorToken: string;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
    creatorId = await seedUser(db, { username: 'chef' });
    inviteeId = await seedUser(db, { username: 'guest' });
    collaboratorId = await seedUser(db, { username: 'helper' });
    creatorToken = await getToken(creatorId, 'chef');
    // Create dishes and menu
    await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES ('d1', '红烧肉', ?)").bind(creatorId).run();
  });

  async function createMenu() {
    const app = await getApp();
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const res = await app.request('/api/v1/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creatorToken}` },
      body: JSON.stringify({
        title: '测试菜单',
        mealType: 'dinner',
        mealTime: tomorrow,
        deadline: tomorrow,
        inviteeIds: [inviteeId],
        dishes: [{ dishId: 'd1' }],
      }),
    }, env);
    return (await res.json() as any).id;
  }

  it('PUT /menus/:id/invitees should update invitees', async () => {
    const menuId = await createMenu();
    const app = await getApp();
    const res = await app.request(`/api/v1/menus/${menuId}/invitees`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creatorToken}` },
      body: JSON.stringify({ inviteeIds: [inviteeId, collaboratorId] }),
    }, env);
    expect(res.status).toBe(200);
  });

  it('PUT /menus/:id/collaborators should update collaborators', async () => {
    const menuId = await createMenu();
    const app = await getApp();
    const res = await app.request(`/api/v1/menus/${menuId}/collaborators`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creatorToken}` },
      body: JSON.stringify({ collaboratorIds: [collaboratorId] }),
    }, env);
    expect(res.status).toBe(200);
  });

  it('POST /menus/:id/dishes should add dish', async () => {
    const menuId = await createMenu();
    await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES ('d2', '清蒸鱼', ?)").bind(creatorId).run();
    const app = await getApp();
    const res = await app.request(`/api/v1/menus/${menuId}/dishes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creatorToken}` },
      body: JSON.stringify({ dishId: 'd2' }),
    }, env);
    expect(res.status).toBe(201);
  });

  it('PUT /menus/:id/dishes/reorder should reorder dishes', async () => {
    const menuId = await createMenu();
    // Get menu dish IDs
    const detail = await db.prepare('SELECT id FROM menu_dishes WHERE menu_id = ?').bind(menuId).all();
    const menuDishIds = detail.results!.map((r: any) => r.id);

    const app = await getApp();
    const res = await app.request(`/api/v1/menus/${menuId}/dishes/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creatorToken}` },
      body: JSON.stringify({ order: menuDishIds.map((id: string, i: number) => ({ menuDishId: id, sortOrder: i })) }),
    }, env);
    expect(res.status).toBe(200);
  });
});

describe('Coverage - Auth input validation', () => {
  let db: SqliteD1Database;
  let env: Env;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
  });

  it('should reject invalid username format', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'bad user!', email: 'a@b.com', password: 'test12345', displayName: '测试' }),
    }, env);
    expect(res.status).toBe(400);
  });

  it('should reject invalid email format', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'good', email: 'notanemail', password: 'test12345', displayName: '测试' }),
    }, env);
    expect(res.status).toBe(400);
  });

  it('should reject short password (< 8)', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'good', email: 'a@b.com', password: 'short', displayName: '测试' }),
    }, env);
    expect(res.status).toBe(400);
  });

  it('should reject long display name', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'good', email: 'a@b.com', password: 'test12345', displayName: 'x'.repeat(51) }),
    }, env);
    expect(res.status).toBe(400);
  });
});

describe('Coverage - FileSystemStorage', () => {
  let storage: FileSystemStorage;
  let cleanup: () => void;

  beforeEach(() => {
    const result = createTestStorage();
    storage = result.storage;
    cleanup = result.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('should put and get a file', async () => {
    await storage.put('test/file.txt', 'hello world', { httpMetadata: { contentType: 'text/plain' } });
    const obj = await storage.get('test/file.txt');
    expect(obj).not.toBeNull();
    expect(obj!.httpMetadata.contentType).toBe('text/plain');

    // Read body
    const reader = obj!.body.getReader();
    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toBe('hello world');
  });

  it('should put and get ArrayBuffer', async () => {
    const buf = new Uint8Array([1, 2, 3]).buffer;
    await storage.put('test/binary.bin', buf);
    const obj = await storage.get('test/binary.bin');
    expect(obj).not.toBeNull();
  });

  it('should put with ReadableStream', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('stream data'));
        controller.close();
      },
    });
    await storage.put('test/stream.txt', stream);
    const obj = await storage.get('test/stream.txt');
    expect(obj).not.toBeNull();
  });

  it('should return null for nonexistent key', async () => {
    const obj = await storage.get('nonexistent');
    expect(obj).toBeNull();
  });

  it('should delete a file', async () => {
    await storage.put('test/del.txt', 'temp');
    await storage.delete('test/del.txt');
    const obj = await storage.get('test/del.txt');
    expect(obj).toBeNull();
  });

  it('should handle delete of nonexistent file', async () => {
    await expect(storage.delete('nonexistent')).resolves.not.toThrow();
  });

  it('should reject path traversal', async () => {
    await expect(storage.get('../../../etc/passwd')).rejects.toThrow('Invalid storage key');
    await expect(storage.put('../../../etc/evil', 'data')).rejects.toThrow('Invalid storage key');
    await expect(storage.delete('../../../etc/evil')).rejects.toThrow('Invalid storage key');
  });

  it('should get file without metadata', async () => {
    await storage.put('test/nometa.txt', 'no meta');
    const obj = await storage.get('test/nometa.txt');
    expect(obj).not.toBeNull();
    expect(obj!.httpMetadata.contentType).toBe('application/octet-stream');
  });
});

function createJpegFile(name = 'test.jpg', size = 100): File {
  const data = new Uint8Array(size);
  data[0] = 0xFF; data[1] = 0xD8; data[2] = 0xFF; // JPEG magic
  return new File([data], name, { type: 'image/jpeg' });
}

describe('Coverage - Dish photo routes', () => {
  let db: SqliteD1Database;
  let storage: FileSystemStorage;
  let cleanup: () => void;
  let env: Env;
  let token: string;
  let userId: string;

  beforeEach(async () => {
    db = createTestDb();
    const s = createTestStorage();
    storage = s.storage;
    cleanup = s.cleanup;
    env = await createEnv(db, storage);
    userId = await seedUser(db, { username: 'chef' });
    token = await getToken(userId, 'chef');
    await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES ('d1', '红烧肉', ?)").bind(userId).run();
  });

  afterEach(() => cleanup());

  it('POST /dishes/:id/photos should upload photo', async () => {
    const app = await getApp();
    const formData = new FormData();
    formData.append('file', createJpegFile());
    const res = await app.request('/api/v1/dishes/d1/photos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }, env);
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.url).toContain('/api/v1/photos/');
  });

  it('PUT /dishes/:id/default-photo should set default', async () => {
    // First upload a photo
    const photoId = crypto.randomUUID().replace(/-/g, '');
    await db.prepare("INSERT INTO dish_photos (id, dish_id, photo_url, uploaded_by) VALUES (?, 'd1', '/test.jpg', ?)").bind(photoId, userId).run();

    const app = await getApp();
    const res = await app.request('/api/v1/dishes/d1/default-photo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ photoId }),
    }, env);
    expect(res.status).toBe(200);
  });

  it('PUT /dishes/:id/default-photo should reject missing photoId', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/dishes/d1/default-photo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    }, env);
    expect(res.status).toBe(400);
  });

  it('DELETE /dishes/:id/photos/:photoId should delete', async () => {
    const photoId = crypto.randomUUID().replace(/-/g, '');
    await storage.put(`dishes/d1/${photoId}`, 'data');
    await db.prepare("INSERT INTO dish_photos (id, dish_id, photo_url, uploaded_by) VALUES (?, 'd1', '/test.jpg', ?)").bind(photoId, userId).run();

    const app = await getApp();
    const res = await app.request(`/api/v1/dishes/d1/photos/${photoId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(200);
  });
});

describe('Coverage - Upload image (general)', () => {
  let db: SqliteD1Database;
  let storage: FileSystemStorage;
  let cleanup: () => void;
  let env: Env;
  let token: string;

  beforeEach(async () => {
    db = createTestDb();
    const s = createTestStorage();
    storage = s.storage;
    cleanup = s.cleanup;
    env = await createEnv(db, storage);
    const userId = await seedUser(db, { username: 'uploader' });
    token = await getToken(userId, 'uploader');
  });

  afterEach(() => cleanup());

  it('POST /uploads/image should upload and return url', async () => {
    const app = await getApp();
    const formData = new FormData();
    formData.append('file', createJpegFile());
    const res = await app.request('/api/v1/uploads/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }, env);
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.url).toContain('/api/v1/photos/uploads/');
  });

  it('POST /uploads/image should reject no file', async () => {
    const app = await getApp();
    const formData = new FormData();
    const res = await app.request('/api/v1/uploads/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }, env);
    expect(res.status).toBe(400);
  });

  it('POST /uploads/image should reject invalid type', async () => {
    const app = await getApp();
    const formData = new FormData();
    formData.append('file', new File(['test'], 'doc.txt', { type: 'text/plain' }));
    const res = await app.request('/api/v1/uploads/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }, env);
    expect(res.status).toBe(400);
  });

  it('POST /uploads/image should reject bad magic bytes', async () => {
    const app = await getApp();
    const formData = new FormData();
    // File with correct MIME type but wrong content
    formData.append('file', new File([new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])], 'fake.jpg', { type: 'image/jpeg' }));
    const res = await app.request('/api/v1/uploads/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }, env);
    expect(res.status).toBe(400);
  });
});

describe('Coverage - Menu validation branches', () => {
  let db: SqliteD1Database;
  let env: Env;
  let token: string;
  let userId: string;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
    userId = await seedUser(db, { username: 'chef' });
    token = await getToken(userId, 'chef');
  });

  it('POST /menus should reject invalid mealType', async () => {
    const otherId = await seedUser(db, { username: 'guest' });
    const app = await getApp();
    const res = await app.request('/api/v1/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: '测试', mealType: 'invalid', mealTime: new Date().toISOString(),
        deadline: new Date().toISOString(), inviteeIds: [otherId],
      }),
    }, env);
    expect(res.status).toBe(400);
  });

  it('POST /menus should reject title > 100 chars', async () => {
    const otherId = await seedUser(db, { username: 'guest' });
    const app = await getApp();
    const res = await app.request('/api/v1/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'x'.repeat(101), mealType: 'dinner', mealTime: new Date().toISOString(),
        deadline: new Date().toISOString(), inviteeIds: [otherId],
      }),
    }, env);
    expect(res.status).toBe(400);
  });

  it('POST /menus should reject invalid date', async () => {
    const otherId = await seedUser(db, { username: 'guest' });
    const app = await getApp();
    const res = await app.request('/api/v1/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: '测试', mealType: 'dinner', mealTime: 'not-a-date',
        deadline: new Date().toISOString(), inviteeIds: [otherId],
      }),
    }, env);
    expect(res.status).toBe(400);
  });

  it('POST /menus should reject missing invitees', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: '测试', mealType: 'dinner', mealTime: new Date().toISOString(),
        deadline: new Date().toISOString(),
      }),
    }, env);
    expect(res.status).toBe(400);
  });
});
