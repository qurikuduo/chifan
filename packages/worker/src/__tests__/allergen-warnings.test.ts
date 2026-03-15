/**
 * Tests for allergen warning detection feature:
 * - MenuService.getAllergenWarnings()
 * - GET /menus/:menuId/allergen-warnings route
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, seedUser, seedCategory, seedIngredient } from './helpers/test-db.js';
import { SqliteD1Database } from '../adapters/sqlite.js';
import { signToken } from '../middleware/auth.js';
import type { Env } from '../env.js';

const JWT_SECRET = 'allergen-test-secret';

async function createEnv(db: SqliteD1Database): Promise<Env> {
  return {
    DB: db as any,
    PHOTOS: { put: async () => {}, get: async () => null, delete: async () => {} } as any,
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

// Helper to seed a menu with dishes, invitees, and allergens
async function seedMenuWithAllergens(db: SqliteD1Database) {
  const adminId = await seedUser(db, { username: 'chef', displayName: 'Chef', isAdmin: true });
  const userId = await seedUser(db, { username: 'alice', displayName: 'Alice' });
  const userId2 = await seedUser(db, { username: 'bob', displayName: 'Bob' });

  const catId = await seedCategory(db, '调料');
  const ing1 = await seedIngredient(db, '花生', catId);
  const ing2 = await seedIngredient(db, '牛奶', catId);
  const ing3 = await seedIngredient(db, '鸡蛋', catId);

  // Alice is allergic to 花生
  await db.prepare('INSERT INTO user_allergens (user_id, ingredient_id) VALUES (?, ?)').bind(userId, ing1).run();
  // Bob is allergic to 牛奶 and 鸡蛋
  await db.prepare('INSERT INTO user_allergens (user_id, ingredient_id) VALUES (?, ?)').bind(userId2, ing2).run();
  await db.prepare('INSERT INTO user_allergens (user_id, ingredient_id) VALUES (?, ?)').bind(userId2, ing3).run();

  // Create dish1 (contains 花生 and 鸡蛋)
  const dish1Id = crypto.randomUUID().replace(/-/g, '');
  await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES (?, '宫保鸡丁', ?)").bind(dish1Id, adminId).run();
  await db.prepare('INSERT INTO dish_ingredients (dish_id, ingredient_id) VALUES (?, ?)').bind(dish1Id, ing1).run();
  await db.prepare('INSERT INTO dish_ingredients (dish_id, ingredient_id) VALUES (?, ?)').bind(dish1Id, ing3).run();

  // Create dish2 (contains 牛奶)
  const dish2Id = crypto.randomUUID().replace(/-/g, '');
  await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES (?, '奶油蘑菇汤', ?)").bind(dish2Id, adminId).run();
  await db.prepare('INSERT INTO dish_ingredients (dish_id, ingredient_id) VALUES (?, ?)').bind(dish2Id, ing2).run();

  // Create dish3 (no allergen ingredients)
  const dish3Id = crypto.randomUUID().replace(/-/g, '');
  await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES (?, '清蒸鱼', ?)").bind(dish3Id, adminId).run();

  // Create menu
  const menuId = crypto.randomUUID().replace(/-/g, '');
  await db.prepare(
    "INSERT INTO menus (id, title, meal_type, meal_time, deadline, status, created_by) VALUES (?, '晚餐', 'dinner', '2025-01-01 18:00', '2025-01-01 12:00', 'published', ?)"
  ).bind(menuId, adminId).run();

  // Add creators
  await db.prepare("INSERT INTO menu_creators (menu_id, user_id, role) VALUES (?, ?, 'owner')").bind(menuId, adminId).run();

  // Add dishes to menu
  const md1 = crypto.randomUUID().replace(/-/g, '');
  const md2 = crypto.randomUUID().replace(/-/g, '');
  const md3 = crypto.randomUUID().replace(/-/g, '');
  await db.prepare('INSERT INTO menu_dishes (id, menu_id, dish_id, sort_order, added_by) VALUES (?, ?, ?, 0, ?)').bind(md1, menuId, dish1Id, adminId).run();
  await db.prepare('INSERT INTO menu_dishes (id, menu_id, dish_id, sort_order, added_by) VALUES (?, ?, ?, 1, ?)').bind(md2, menuId, dish2Id, adminId).run();
  await db.prepare('INSERT INTO menu_dishes (id, menu_id, dish_id, sort_order, added_by) VALUES (?, ?, ?, 2, ?)').bind(md3, menuId, dish3Id, adminId).run();

  // Add invitees
  await db.prepare('INSERT INTO menu_invitees (menu_id, user_id) VALUES (?, ?)').bind(menuId, userId).run();
  await db.prepare('INSERT INTO menu_invitees (menu_id, user_id) VALUES (?, ?)').bind(menuId, userId2).run();

  return { adminId, userId, userId2, menuId, dish1Id, dish2Id, dish3Id, ing1, ing2, ing3, md1, md2, md3 };
}

describe('Allergen Warnings - Service', () => {
  let db: SqliteD1Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('should detect allergen conflicts for dishes with allergenic ingredients', async () => {
    const { menuId } = await seedMenuWithAllergens(db);
    const { MenuService } = await import('../services/menu.service.js');
    const service = new MenuService(db as any);
    const warnings = await service.getAllergenWarnings(menuId);

    // dish1 (宫保鸡丁) has 花生 (Alice) + 鸡蛋 (Bob) → 2 conflicts
    const dish1Warning = warnings.find(w => w.dishName === '宫保鸡丁');
    expect(dish1Warning).toBeDefined();
    expect(dish1Warning!.conflicts.length).toBe(2);
    expect(dish1Warning!.conflicts.some(c => c.userName === 'Alice' && c.ingredientName === '花生')).toBe(true);
    expect(dish1Warning!.conflicts.some(c => c.userName === 'Bob' && c.ingredientName === '鸡蛋')).toBe(true);

    // dish2 (奶油蘑菇汤) has 牛奶 (Bob) → 1 conflict
    const dish2Warning = warnings.find(w => w.dishName === '奶油蘑菇汤');
    expect(dish2Warning).toBeDefined();
    expect(dish2Warning!.conflicts.length).toBe(1);
    expect(dish2Warning!.conflicts[0].userName).toBe('Bob');
    expect(dish2Warning!.conflicts[0].ingredientName).toBe('牛奶');

    // dish3 (清蒸鱼) has no allergen ingredients → not in warnings
    expect(warnings.find(w => w.dishName === '清蒸鱼')).toBeUndefined();
  });

  it('should return empty array when no allergens are set', async () => {
    db = createTestDb();
    const adminId = await seedUser(db, { username: 'chef2', isAdmin: true });
    const userId = await seedUser(db, { username: 'user2' });

    const dishId = crypto.randomUUID().replace(/-/g, '');
    await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES (?, 'test', ?)").bind(dishId, adminId).run();

    const menuId = crypto.randomUUID().replace(/-/g, '');
    await db.prepare(
      "INSERT INTO menus (id, title, meal_type, meal_time, deadline, status, created_by) VALUES (?, 'test', 'dinner', '2025-01-01', '2025-01-01', 'published', ?)"
    ).bind(menuId, adminId).run();
    await db.prepare("INSERT INTO menu_creators (menu_id, user_id, role) VALUES (?, ?, 'owner')").bind(menuId, adminId).run();

    const mdId = crypto.randomUUID().replace(/-/g, '');
    await db.prepare('INSERT INTO menu_dishes (id, menu_id, dish_id, sort_order, added_by) VALUES (?, ?, ?, 0, ?)').bind(mdId, menuId, dishId, adminId).run();
    await db.prepare('INSERT INTO menu_invitees (menu_id, user_id) VALUES (?, ?)').bind(menuId, userId).run();

    const { MenuService } = await import('../services/menu.service.js');
    const service = new MenuService(db as any);
    const warnings = await service.getAllergenWarnings(menuId);
    expect(warnings).toEqual([]);
  });

  it('should return empty array when menu has no dishes', async () => {
    db = createTestDb();
    const adminId = await seedUser(db, { username: 'chef3', isAdmin: true });

    const menuId = crypto.randomUUID().replace(/-/g, '');
    await db.prepare(
      "INSERT INTO menus (id, title, meal_type, meal_time, deadline, status, created_by) VALUES (?, 'empty', 'dinner', '2025-01-01', '2025-01-01', 'draft', ?)"
    ).bind(menuId, adminId).run();
    await db.prepare("INSERT INTO menu_creators (menu_id, user_id, role) VALUES (?, ?, 'owner')").bind(menuId, adminId).run();

    const { MenuService } = await import('../services/menu.service.js');
    const service = new MenuService(db as any);
    const warnings = await service.getAllergenWarnings(menuId);
    expect(warnings).toEqual([]);
  });

  it('should handle dishes with no ingredients', async () => {
    db = createTestDb();
    const adminId = await seedUser(db, { username: 'chef4', isAdmin: true });
    const userId = await seedUser(db, { username: 'user4' });

    const catId = await seedCategory(db, '调料');
    const ingId = await seedIngredient(db, '虾', catId);
    await db.prepare('INSERT INTO user_allergens (user_id, ingredient_id) VALUES (?, ?)').bind(userId, ingId).run();

    const dishId = crypto.randomUUID().replace(/-/g, '');
    await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES (?, '白米饭', ?)").bind(dishId, adminId).run();
    // No ingredients for this dish

    const menuId = crypto.randomUUID().replace(/-/g, '');
    await db.prepare(
      "INSERT INTO menus (id, title, meal_type, meal_time, deadline, status, created_by) VALUES (?, 'test', 'dinner', '2025-01-01', '2025-01-01', 'published', ?)"
    ).bind(menuId, adminId).run();
    await db.prepare("INSERT INTO menu_creators (menu_id, user_id, role) VALUES (?, ?, 'owner')").bind(menuId, adminId).run();

    const mdId = crypto.randomUUID().replace(/-/g, '');
    await db.prepare('INSERT INTO menu_dishes (id, menu_id, dish_id, sort_order, added_by) VALUES (?, ?, ?, 0, ?)').bind(mdId, menuId, dishId, adminId).run();
    await db.prepare('INSERT INTO menu_invitees (menu_id, user_id) VALUES (?, ?)').bind(menuId, userId).run();

    const { MenuService } = await import('../services/menu.service.js');
    const service = new MenuService(db as any);
    const warnings = await service.getAllergenWarnings(menuId);
    expect(warnings).toEqual([]); // Dish has no ingredients → no conflicts
  });
});

describe('Allergen Warnings - Route', () => {
  let db: SqliteD1Database;
  let env: Env;

  beforeEach(() => {
    db = createTestDb();
  });

  it('GET /menus/:menuId/allergen-warnings returns correct warnings', async () => {
    const { adminId, menuId } = await seedMenuWithAllergens(db);
    env = await createEnv(db);
    const token = await getToken(adminId, 'chef', true);
    const app = await getApp();

    const res = await app.request(`/api/v1/menus/${menuId}/allergen-warnings`, {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any[];
    expect(body.length).toBe(2); // 2 dishes with conflicts

    const gongbao = body.find((w: any) => w.dishName === '宫保鸡丁');
    expect(gongbao).toBeDefined();
    expect(gongbao.conflicts.length).toBe(2);

    const soup = body.find((w: any) => w.dishName === '奶油蘑菇汤');
    expect(soup).toBeDefined();
    expect(soup.conflicts.length).toBe(1);
  });

  it('GET /menus/:menuId/allergen-warnings returns 401 without auth', async () => {
    await seedMenuWithAllergens(db);
    env = await createEnv(db);
    const app = await getApp();

    const res = await app.request('/api/v1/menus/abcdef/allergen-warnings', {}, env);
    expect(res.status).toBe(401);
  });

  it('GET /menus/:menuId/allergen-warnings returns empty for non-existent menu', async () => {
    const adminId = await seedUser(db, { username: 'admin5', isAdmin: true });
    env = await createEnv(db);
    const token = await getToken(adminId, 'admin5', true);
    const app = await getApp();

    const res = await app.request('/api/v1/menus/nonexistent/allergen-warnings', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const body = await res.json() as any[];
    expect(body).toEqual([]);
  });

  it('multiple users allergic to same ingredient in same dish', async () => {
    // Both Alice and Bob are allergic to same ingredient
    const adminId = await seedUser(db, { username: 'chef6', displayName: 'Chef', isAdmin: true });
    const userId1 = await seedUser(db, { username: 'alice6', displayName: 'Alice' });
    const userId2 = await seedUser(db, { username: 'bob6', displayName: 'Bob' });

    const catId = await seedCategory(db, '海鲜');
    const shrimpId = await seedIngredient(db, '虾', catId);

    // Both users allergic to shrimp
    await db.prepare('INSERT INTO user_allergens (user_id, ingredient_id) VALUES (?, ?)').bind(userId1, shrimpId).run();
    await db.prepare('INSERT INTO user_allergens (user_id, ingredient_id) VALUES (?, ?)').bind(userId2, shrimpId).run();

    const dishId = crypto.randomUUID().replace(/-/g, '');
    await db.prepare("INSERT INTO dishes (id, name, created_by) VALUES (?, '虾仁炒饭', ?)").bind(dishId, adminId).run();
    await db.prepare('INSERT INTO dish_ingredients (dish_id, ingredient_id) VALUES (?, ?)').bind(dishId, shrimpId).run();

    const menuId = crypto.randomUUID().replace(/-/g, '');
    await db.prepare(
      "INSERT INTO menus (id, title, meal_type, meal_time, deadline, status, created_by) VALUES (?, 'test', 'dinner', '2025-01-01', '2025-01-01', 'published', ?)"
    ).bind(menuId, adminId).run();
    await db.prepare("INSERT INTO menu_creators (menu_id, user_id, role) VALUES (?, ?, 'owner')").bind(menuId, adminId).run();

    const mdId = crypto.randomUUID().replace(/-/g, '');
    await db.prepare('INSERT INTO menu_dishes (id, menu_id, dish_id, sort_order, added_by) VALUES (?, ?, ?, 0, ?)').bind(mdId, menuId, dishId, adminId).run();
    await db.prepare('INSERT INTO menu_invitees (menu_id, user_id) VALUES (?, ?)').bind(menuId, userId1).run();
    await db.prepare('INSERT INTO menu_invitees (menu_id, user_id) VALUES (?, ?)').bind(menuId, userId2).run();

    const { MenuService } = await import('../services/menu.service.js');
    const service = new MenuService(db as any);
    const warnings = await service.getAllergenWarnings(menuId);

    expect(warnings.length).toBe(1);
    expect(warnings[0].dishName).toBe('虾仁炒饭');
    expect(warnings[0].conflicts.length).toBe(2);
    expect(warnings[0].conflicts.some(c => c.userName === 'Alice')).toBe(true);
    expect(warnings[0].conflicts.some(c => c.userName === 'Bob')).toBe(true);
  });
});
