/**
 * Integration tests for route handlers using real SQLite.
 * Uses the full Hono app with actual DB and JWT tokens.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, createTestStorage, seedUser, seedTag, seedIngredient, seedCookingMethod, seedCategory } from './helpers/test-db.js';
import { SqliteD1Database } from '../adapters/sqlite.js';
import { signToken } from '../middleware/auth.js';
import { hashPassword } from '../utils/password.js';
import type { Env } from '../env.js';

const JWT_SECRET = 'test-route-integration-secret';

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

describe('Route Integration - Auth', () => {
  let db: SqliteD1Database;
  let env: Env;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
  });

  it('POST /auth/register should create pending user', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'mama',
        email: 'mama@test.com',
        password: 'test123456',
        displayName: '妈妈',
      }),
    }, env);

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.message).toContain('注册成功');

    // Verify in DB
    const user = await db.prepare('SELECT status FROM users WHERE username = ?').bind('mama').first<any>();
    expect(user.status).toBe('pending');
  });

  it('POST /auth/login should return token', async () => {
    const hash = await hashPassword('mypassword');
    await seedUser(db, { username: 'test', email: 'test@test.com', passwordHash: hash, status: 'approved' });

    const app = await getApp();
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'test', password: 'mypassword' }),
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.token).toBeTruthy();
    expect(body.user.username).toBe('test');
  });

  it('GET /auth/me should return current user', async () => {
    const id = await seedUser(db, { username: 'me', displayName: 'Me' });
    const token = await getToken(id, 'me');

    const app = await getApp();
    const res = await app.request('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.username).toBe('me');
    expect(body.displayName).toBe('Me');
  });

  it('POST /auth/logout should succeed', async () => {
    const id = await seedUser(db, { username: 'me' });
    const token = await getToken(id, 'me');

    const app = await getApp();
    const res = await app.request('/api/v1/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
  });
});

describe('Route Integration - Dishes', () => {
  let db: SqliteD1Database;
  let env: Env;
  let userId: string;
  let token: string;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
    userId = await seedUser(db, { username: 'chef', displayName: '大厨' });
    token = await getToken(userId, 'chef');
  });

  it('POST /dishes should create a dish', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/dishes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: '红烧肉', description: '好吃' }),
    }, env);

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.id).toBeTruthy();
  });

  it('GET /dishes should return list', async () => {
    // Create some dishes directly
    await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES ('d1', '红烧肉', ?)").bind(userId).run();
    await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES ('d2', '清蒸鱼', ?)").bind(userId).run();

    const app = await getApp();
    const res = await app.request('/api/v1/dishes?page=1&pageSize=10', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.length).toBe(2);
    expect(body.pagination.total).toBe(2);
  });

  it('GET /dishes/:id should return dish detail', async () => {
    await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES ('d1', '红烧肉', ?)").bind(userId).run();

    const app = await getApp();
    const res = await app.request('/api/v1/dishes/d1', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.name).toBe('红烧肉');
  });

  it('PUT /dishes/:id should update dish', async () => {
    await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES ('d1', '红烧肉', ?)").bind(userId).run();

    const app = await getApp();
    const res = await app.request('/api/v1/dishes/d1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: '新菜名' }),
    }, env);

    expect(res.status).toBe(200);
  });

  it('DELETE /dishes/:id should delete dish', async () => {
    await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES ('d1', '红烧肉', ?)").bind(userId).run();

    const app = await getApp();
    const res = await app.request('/api/v1/dishes/d1', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);

    const row = await db.prepare('SELECT id FROM dishes WHERE id = ?').bind('d1').first();
    expect(row).toBeNull();
  });

  it('GET /dishes/search should find by keyword', async () => {
    await db.prepare("INSERT INTO dishes (id, name, pinyin, created_by) VALUES ('d1', '红烧肉', 'hongshaorou', ?)").bind(userId).run();

    const app = await getApp();
    const res = await app.request('/api/v1/dishes/search?q=红烧', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.length).toBe(1);
  });

  it('GET /dishes/favorites should return empty for new user', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/dishes/favorites', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body).toEqual([]);
  });

  it('POST /dishes/:id/clone should clone a dish', async () => {
    await db.prepare("INSERT INTO dishes (id, name, description, created_by) VALUES ('d1', '红烧肉', '经典', ?)").bind(userId).run();

    const app = await getApp();
    const res = await app.request('/api/v1/dishes/d1/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: '改良红烧肉' }),
    }, env);

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.id).toBeTruthy();
  });
});

describe('Route Integration - Menus', () => {
  let db: SqliteD1Database;
  let env: Env;
  let creatorId: string;
  let inviteeId: string;
  let creatorToken: string;
  let inviteeToken: string;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
    creatorId = await seedUser(db, { username: 'chef', displayName: '大厨' });
    inviteeId = await seedUser(db, { username: 'guest', displayName: '客人' });
    creatorToken = await getToken(creatorId, 'chef');
    inviteeToken = await getToken(inviteeId, 'guest');
    // Create dishes
    await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES ('dish1', '红烧肉', ?)").bind(creatorId).run();
    await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES ('dish2', '清蒸鱼', ?)").bind(creatorId).run();
  });

  async function createMenu() {
    const app = await getApp();
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const res = await app.request('/api/v1/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creatorToken}` },
      body: JSON.stringify({
        title: '晚餐',
        mealType: 'dinner',
        mealTime: tomorrow,
        deadline: tomorrow,
        inviteeIds: [inviteeId],
        dishes: [{ dishId: 'dish1' }, { dishId: 'dish2' }],
      }),
    }, env);
    const body = await res.json() as any;
    return body.id;
  }

  it('POST /menus should create a menu', async () => {
    const id = await createMenu();
    expect(id).toBeTruthy();
  });

  it('GET /menus should list menus', async () => {
    await createMenu();

    const app = await getApp();
    const res = await app.request('/api/v1/menus', {
      headers: { Authorization: `Bearer ${creatorToken}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.items.length).toBe(1);
  });

  it('GET /menus/:id should return menu detail', async () => {
    const menuId = await createMenu();

    const app = await getApp();
    const res = await app.request(`/api/v1/menus/${menuId}`, {
      headers: { Authorization: `Bearer ${creatorToken}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.title).toBe('晚餐');
    expect(body.dishes.length).toBe(2);
  });

  it('PUT /menus/:id should update menu', async () => {
    const menuId = await createMenu();

    const app = await getApp();
    const res = await app.request(`/api/v1/menus/${menuId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creatorToken}` },
      body: JSON.stringify({ title: '午餐' }),
    }, env);

    expect(res.status).toBe(200);
  });

  it('POST /menus/:id/publish should publish menu', async () => {
    const menuId = await createMenu();

    const app = await getApp();
    const res = await app.request(`/api/v1/menus/${menuId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creatorToken}` },
    }, env);

    expect(res.status).toBe(200);

    // Verify status
    const menu = await db.prepare('SELECT status FROM menus WHERE id = ?').bind(menuId).first<any>();
    expect(menu.status).toBe('published');
  });

  it('POST /menus/:id/close-selection should close selection', async () => {
    const menuId = await createMenu();
    // Publish first
    await db.prepare("UPDATE menus SET status = 'published' WHERE id = ?").bind(menuId).run();

    const app = await getApp();
    const res = await app.request(`/api/v1/menus/${menuId}/close-selection`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creatorToken}` },
    }, env);

    expect(res.status).toBe(200);
  });

  it('POST /menus/:id/start-cooking should start cooking', async () => {
    const menuId = await createMenu();
    await db.prepare("UPDATE menus SET status = 'selection_closed' WHERE id = ?").bind(menuId).run();

    const app = await getApp();
    const res = await app.request(`/api/v1/menus/${menuId}/start-cooking`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creatorToken}` },
    }, env);

    expect(res.status).toBe(200);
  });

  it('POST /menus/:id/complete should complete menu', async () => {
    const menuId = await createMenu();
    await db.prepare("UPDATE menus SET status = 'cooking' WHERE id = ?").bind(menuId).run();

    const app = await getApp();
    const res = await app.request(`/api/v1/menus/${menuId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creatorToken}` },
    }, env);

    expect(res.status).toBe(200);
  });

  it('DELETE /menus/:id should delete draft menu', async () => {
    const menuId = await createMenu();

    const app = await getApp();
    const res = await app.request(`/api/v1/menus/${menuId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${creatorToken}` },
    }, env);

    expect(res.status).toBe(204);
  });

  it('GET /menus/:id/selection-summary should return summary', async () => {
    const menuId = await createMenu();
    await db.prepare("UPDATE menus SET status = 'published' WHERE id = ?").bind(menuId).run();

    const app = await getApp();
    const res = await app.request(`/api/v1/menus/${menuId}/selections/summary`, {
      headers: { Authorization: `Bearer ${creatorToken}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.totalInvitees).toBe(1);
  });

  it('GET /menus/:id/print should return print data', async () => {
    const menuId = await createMenu();

    const app = await getApp();
    const res = await app.request(`/api/v1/menus/${menuId}/print`, {
      headers: { Authorization: `Bearer ${creatorToken}` },
    }, env);

    expect(res.status).toBe(200);
  });
});

describe('Route Integration - Selections', () => {
  let db: SqliteD1Database;
  let env: Env;
  let creatorId: string;
  let inviteeId: string;
  let inviteeToken: string;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
    creatorId = await seedUser(db, { username: 'chef' });
    inviteeId = await seedUser(db, { username: 'guest' });
    inviteeToken = await getToken(inviteeId, 'guest');
  });

  it('PUT /menus/:id/selections should submit and GET should retrieve', async () => {
    // Setup menu manually
    const menuId = 'menu1';
    const mdId = 'md1';
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES ('d1', 'Dish', ?)").bind(creatorId).run();
    await db.prepare("INSERT INTO menus (id, title, meal_type, meal_time, deadline, status, created_by) VALUES (?, '晚餐', 'dinner', ?, ?, 'published', ?)").bind(menuId, tomorrow, tomorrow, creatorId).run();
    await db.prepare("INSERT INTO menu_creators (menu_id, user_id, role) VALUES (?, ?, 'owner')").bind(menuId, creatorId).run();
    await db.prepare("INSERT INTO menu_invitees (menu_id, user_id) VALUES (?, ?)").bind(menuId, inviteeId).run();
    await db.prepare("INSERT INTO menu_dishes (id, menu_id, dish_id, sort_order, added_by) VALUES (?, ?, 'd1', 0, ?)").bind(mdId, menuId, creatorId).run();

    const app = await getApp();

    // Submit selections
    const putRes = await app.request(`/api/v1/menus/${menuId}/selections`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${inviteeToken}` },
      body: JSON.stringify({ menuDishIds: [mdId] }),
    }, env);
    expect(putRes.status).toBe(200);

    // Get selections
    const getRes = await app.request(`/api/v1/menus/${menuId}/selections/me`, {
      headers: { Authorization: `Bearer ${inviteeToken}` },
    }, env);
    expect(getRes.status).toBe(200);
    const body = await getRes.json() as any;
    expect(body.length).toBe(1);
  });
});

describe('Route Integration - Notifications', () => {
  let db: SqliteD1Database;
  let env: Env;
  let userId: string;
  let token: string;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
    userId = await seedUser(db, { username: 'user' });
    token = await getToken(userId, 'user');
  });

  it('GET /notifications should return list', async () => {
    // Insert notification directly
    await db.prepare("INSERT INTO notifications (id, user_id, type, title, content) VALUES ('n1', ?, 'menu_published', '新菜单', '内容')").bind(userId).run();

    const app = await getApp();
    const res = await app.request('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.items.length).toBe(1);
  });

  it('GET /notifications/unread-count should return count', async () => {
    await db.prepare("INSERT INTO notifications (id, user_id, type, title) VALUES ('n1', ?, 'menu_published', '通知1')").bind(userId).run();
    await db.prepare("INSERT INTO notifications (id, user_id, type, title) VALUES ('n2', ?, 'meal_ready', '通知2')").bind(userId).run();

    const app = await getApp();
    const res = await app.request('/api/v1/notifications/unread-count', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.count).toBe(2);
  });

  it('PUT /notifications/:id/read should mark as read', async () => {
    await db.prepare("INSERT INTO notifications (id, user_id, type, title) VALUES ('n1', ?, 'menu_published', '通知1')").bind(userId).run();

    const app = await getApp();
    const res = await app.request('/api/v1/notifications/n1/read', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);

    const row = await db.prepare('SELECT is_read FROM notifications WHERE id = ?').bind('n1').first<any>();
    expect(row.is_read).toBe(1);
  });

  it('PUT /notifications/read-all should mark all as read', async () => {
    await db.prepare("INSERT INTO notifications (id, user_id, type, title) VALUES ('n1', ?, 'menu_published', '通知1')").bind(userId).run();
    await db.prepare("INSERT INTO notifications (id, user_id, type, title) VALUES ('n2', ?, 'meal_ready', '通知2')").bind(userId).run();

    const app = await getApp();
    const res = await app.request('/api/v1/notifications/read-all', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
  });
});

describe('Route Integration - Users (admin)', () => {
  let db: SqliteD1Database;
  let env: Env;
  let adminId: string;
  let adminToken: string;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
    adminId = await seedUser(db, { username: 'admin', isAdmin: true });
    adminToken = await getToken(adminId, 'admin', true);
  });

  it('GET /users should list users', async () => {
    await seedUser(db, { username: 'user1' });

    const app = await getApp();
    const res = await app.request('/api/v1/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.length).toBeGreaterThanOrEqual(2); // admin + user1
  });

  it('POST /users should create user', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        username: 'newuser',
        email: 'new@test.com',
        password: 'password123',
        displayName: 'New User',
      }),
    }, env);

    expect(res.status).toBe(201);
  });

  it('PUT /users/:id/approve should approve user', async () => {
    const pendingId = await seedUser(db, { username: 'pending', status: 'pending' });

    const app = await getApp();
    const res = await app.request(`/api/v1/users/${pendingId}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'approve' }),
    }, env);

    expect(res.status).toBe(200);
  });

  it('PUT /users/:id should update user', async () => {
    const userId = await seedUser(db, { username: 'target' });

    const app = await getApp();
    const res = await app.request(`/api/v1/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ displayName: 'Updated' }),
    }, env);

    expect(res.status).toBe(200);
  });
});

describe('Route Integration - Admin Resources', () => {
  let db: SqliteD1Database;
  let env: Env;
  let adminToken: string;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
    const adminId = await seedUser(db, { username: 'admin', isAdmin: true });
    adminToken = await getToken(adminId, 'admin', true);
  });

  it('CRUD cooking methods', async () => {
    const app = await getApp();

    // Create
    const createRes = await app.request('/api/v1/cooking-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: '红烧' }),
    }, env);
    expect(createRes.status).toBe(201);
    const created = await createRes.json() as any;
    const id = created.id;

    // List
    const listRes = await app.request('/api/v1/cooking-methods', {
      headers: { Authorization: `Bearer ${adminToken}` },
    }, env);
    expect(listRes.status).toBe(200);

    // Update
    const updateRes = await app.request(`/api/v1/cooking-methods/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: '清蒸' }),
    }, env);
    expect(updateRes.status).toBe(200);

    // Delete
    const delRes = await app.request(`/api/v1/cooking-methods/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, env);
    expect(delRes.status).toBe(200);
  });

  it('CRUD tags', async () => {
    const app = await getApp();

    const createRes = await app.request('/api/v1/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: '家常菜' }),
    }, env);
    expect(createRes.status).toBe(201);
    const id = (await createRes.json() as any).id;

    const delRes = await app.request(`/api/v1/tags/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, env);
    expect(delRes.status).toBe(200);
  });

  it('CRUD ingredients', async () => {
    const app = await getApp();
    const catId = await seedCategory(db, '蔬菜类');

    const createRes = await app.request('/api/v1/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: '白菜', categoryId: catId }),
    }, env);
    expect(createRes.status).toBe(201);
    const id = (await createRes.json() as any).id;

    const delRes = await app.request(`/api/v1/ingredients/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, env);
    expect(delRes.status).toBe(200);
  });

  it('CRUD ingredient categories', async () => {
    const app = await getApp();

    const createRes = await app.request('/api/v1/ingredient-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: '肉类' }),
    }, env);
    expect(createRes.status).toBe(201);
    const id = (await createRes.json() as any).id;

    const delRes = await app.request(`/api/v1/ingredient-categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, env);
    expect(delRes.status).toBe(200);
  });
});

describe('Route Integration - Poll', () => {
  let db: SqliteD1Database;
  let env: Env;
  let token: string;

  beforeEach(async () => {
    db = createTestDb();
    env = await createEnv(db);
    const userId = await seedUser(db, { username: 'poller' });
    token = await getToken(userId, 'poller');
  });

  it('GET /poll should return unread count and active menus', async () => {
    const app = await getApp();
    const res = await app.request('/api/v1/poll', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body).toHaveProperty('unreadCount');
  });
});
