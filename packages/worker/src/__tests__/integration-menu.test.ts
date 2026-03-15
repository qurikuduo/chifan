/**
 * Integration tests for MenuService + NotificationService using real SQLite.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, seedUser } from './helpers/test-db.js';
import { MenuService, NotificationService } from '../services/menu.service.js';
import { DishService } from '../services/dish.service.js';
import { ServiceError } from '../services/auth.service.js';
import { SqliteD1Database } from '../adapters/sqlite.js';
import { createTestStorage } from './helpers/test-db.js';

describe('MenuService (integration)', () => {
  let db: SqliteD1Database;
  let menuService: MenuService;
  let dishService: DishService;
  let creatorId: string;
  let inviteeId: string;
  let dishId1: string;
  let dishId2: string;

  beforeEach(async () => {
    db = createTestDb();
    menuService = new MenuService(db as any);
    const storage = createTestStorage();
    dishService = new DishService(db as any, storage.storage as any);

    creatorId = await seedUser(db, { username: 'chef', displayName: '大厨' });
    inviteeId = await seedUser(db, { username: 'guest', displayName: '客人' });

    const d1 = await dishService.create({ name: '红烧肉' }, creatorId);
    const d2 = await dishService.create({ name: '清蒸鱼' }, creatorId);
    dishId1 = d1.id;
    dishId2 = d2.id;
  });

  async function createTestMenu(opts?: { dishes?: boolean; invitees?: boolean }) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const input = {
      title: '晚餐',
      mealType: 'dinner',
      mealTime: tomorrow,
      deadline: tomorrow,
      inviteeIds: opts?.invitees !== false ? [inviteeId] : [],
      dishes: opts?.dishes !== false ? [{ dishId: dishId1 }, { dishId: dishId2 }] : undefined,
    };
    return menuService.createMenu(creatorId, input);
  }

  describe('createMenu', () => {
    it('should create a menu in draft status', async () => {
      const { id } = await createTestMenu();
      const menu = await menuService.getById(id, creatorId);
      expect(menu.status).toBe('draft');
      expect(menu.title).toBe('晚餐');
      expect(menu.mealType).toBe('dinner');
      expect(menu.dishes.length).toBe(2);
      expect(menu.invitees.length).toBe(1);
      expect(menu.creators.length).toBe(1);
      expect(menu.creators[0].role).toBe('owner');
    });

    it('should create a menu with collaborators', async () => {
      const collabId = await seedUser(db, { username: 'collab', displayName: '协作者' });
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      const { id } = await menuService.createMenu(creatorId, {
        title: '晚餐',
        mealType: 'dinner',
        mealTime: tomorrow,
        deadline: tomorrow,
        inviteeIds: [inviteeId],
        collaboratorIds: [collabId],
      });

      const menu = await menuService.getById(id, creatorId);
      expect(menu.creators.length).toBe(2);
    });
  });

  describe('getById', () => {
    it('should allow creator to view menu', async () => {
      const { id } = await createTestMenu();
      const menu = await menuService.getById(id, creatorId);
      expect(menu.id).toBe(id);
    });

    it('should allow invitee to view menu', async () => {
      const { id } = await createTestMenu();
      const menu = await menuService.getById(id, inviteeId);
      expect(menu.id).toBe(id);
    });

    it('should deny access to non-participant', async () => {
      const otherId = await seedUser(db, { username: 'stranger' });
      const { id } = await createTestMenu();
      await expect(menuService.getById(id, otherId)).rejects.toThrow('无权访问');
    });

    it('should throw NOT_FOUND for nonexistent menu', async () => {
      await expect(menuService.getById('nonexistent', creatorId)).rejects.toThrow('菜单不存在');
    });
  });

  describe('updateMenu', () => {
    it('should update title of draft menu', async () => {
      const { id } = await createTestMenu();
      await menuService.updateMenu(id, creatorId, { title: '午餐' });

      const menu = await menuService.getById(id, creatorId);
      expect(menu.title).toBe('午餐');
    });

    it('should reject update of non-draft menu', async () => {
      const { id } = await createTestMenu();
      // Publish first
      await menuService.publish(id, creatorId, db as any);

      await expect(
        menuService.updateMenu(id, creatorId, { title: '新标题' }),
      ).rejects.toThrow('只能编辑草稿状态的菜单');
    });
  });

  describe('deleteMenu', () => {
    it('should delete draft menu', async () => {
      const { id } = await createTestMenu();
      await menuService.deleteMenu(id, creatorId);

      await expect(menuService.getById(id, creatorId)).rejects.toThrow('菜单不存在');
    });

    it('should reject deletion of non-draft menu', async () => {
      const { id } = await createTestMenu();
      await menuService.publish(id, creatorId, db as any);

      await expect(menuService.deleteMenu(id, creatorId)).rejects.toThrow('只能删除草稿状态的菜单');
    });
  });

  describe('addDish / removeDish', () => {
    it('should add a new dish to menu', async () => {
      const { id: menuId } = await createTestMenu({ dishes: false });
      const { id: mdId } = await menuService.addDish(menuId, creatorId, { dishId: dishId1 });
      expect(mdId).toBeTruthy();

      const menu = await menuService.getById(menuId, creatorId);
      expect(menu.dishes.length).toBe(1);
    });

    it('should reject duplicate dish', async () => {
      const { id: menuId } = await createTestMenu({ dishes: false });
      await menuService.addDish(menuId, creatorId, { dishId: dishId1 });

      await expect(
        menuService.addDish(menuId, creatorId, { dishId: dishId1 }),
      ).rejects.toThrow('该菜品已在菜单中');
    });

    it('should remove dish from menu', async () => {
      const { id: menuId } = await createTestMenu();
      const menu = await menuService.getById(menuId, creatorId);
      const mdId = menu.dishes[0].menuDishId;

      await menuService.removeDish(menuId, mdId, creatorId);

      const updated = await menuService.getById(menuId, creatorId);
      expect(updated.dishes.length).toBe(1);
    });
  });

  describe('updateInvitees', () => {
    it('should replace invitees', async () => {
      const guest2 = await seedUser(db, { username: 'guest2', displayName: '客人2' });
      const { id } = await createTestMenu();

      await menuService.updateInvitees(id, creatorId, [guest2]);

      const menu = await menuService.getById(id, creatorId);
      expect(menu.invitees.length).toBe(1);
      expect(menu.invitees[0].userId).toBe(guest2);
    });
  });

  describe('status transitions (publish → close → cook → complete)', () => {
    it('should transition through full lifecycle', async () => {
      const { id } = await createTestMenu();

      // draft → published
      await menuService.publish(id, creatorId, db as any);
      let menu = await menuService.getById(id, creatorId);
      expect(menu.status).toBe('published');

      // published → selection_closed
      await menuService.closeSelection(id, creatorId);
      menu = await menuService.getById(id, creatorId);
      expect(menu.status).toBe('selection_closed');

      // selection_closed → cooking
      await menuService.startCooking(id, creatorId);
      menu = await menuService.getById(id, creatorId);
      expect(menu.status).toBe('cooking');

      // cooking → completed
      await menuService.complete(id, creatorId, db as any);
      menu = await menuService.getById(id, creatorId);
      expect(menu.status).toBe('completed');
    });

    it('should reject publishing without dishes', async () => {
      const { id } = await createTestMenu({ dishes: false });
      await expect(menuService.publish(id, creatorId, db as any)).rejects.toThrow('至少需要添加一道菜品');
    });

    it('should reject publishing without invitees', async () => {
      const { id } = await createTestMenu({ invitees: false });
      await expect(menuService.publish(id, creatorId, db as any)).rejects.toThrow('至少需要邀请一位家人');
    });

    it('should reject invalid transitions', async () => {
      const { id } = await createTestMenu();

      // Cannot close selection on draft
      await expect(menuService.closeSelection(id, creatorId)).rejects.toThrow('只能关闭选菜中的菜单');

      // Cannot start cooking on draft
      await expect(menuService.startCooking(id, creatorId)).rejects.toThrow('只能在选菜结束后开始烹饪');

      // Cannot complete draft
      await expect(menuService.complete(id, creatorId, db as any)).rejects.toThrow('只能在烹饪中完成菜单');
    });
  });

  describe('selections', () => {
    it('should allow invitee to submit selections', async () => {
      const { id: menuId } = await createTestMenu();
      await menuService.publish(menuId, creatorId, db as any);

      const menu = await menuService.getById(menuId, inviteeId);
      const menuDishIds = menu.dishes.map((d) => d.menuDishId);

      await menuService.submitSelections(menuId, inviteeId, [menuDishIds[0]]);

      const mySelections = await menuService.getMySelections(menuId, inviteeId);
      expect(mySelections.length).toBe(1);
      expect(mySelections[0]).toBe(menuDishIds[0]);
    });

    it('should reject selection on non-published menu', async () => {
      const { id: menuId } = await createTestMenu();

      await expect(
        menuService.submitSelections(menuId, inviteeId, []),
      ).rejects.toThrow('当前菜单不在选菜阶段');
    });

    it('should reject selection by non-invitee', async () => {
      const { id: menuId } = await createTestMenu();
      await menuService.publish(menuId, creatorId, db as any);
      const otherId = await seedUser(db, { username: 'stranger' });

      await expect(
        menuService.submitSelections(menuId, otherId, []),
      ).rejects.toThrow('你不在该菜单的邀请名单中');
    });

    it('should update invitee has_selected flag', async () => {
      const { id: menuId } = await createTestMenu();
      await menuService.publish(menuId, creatorId, db as any);

      const menu = await menuService.getById(menuId, inviteeId);
      const menuDishIds = menu.dishes.map((d) => d.menuDishId);

      await menuService.submitSelections(menuId, inviteeId, menuDishIds);

      const updatedMenu = await menuService.getById(menuId, creatorId);
      const invitee = updatedMenu.invitees.find((i) => i.userId === inviteeId);
      expect(invitee?.hasSelected).toBe(true);
    });
  });

  describe('selectionSummary', () => {
    it('should return correct summary after selections', async () => {
      const { id: menuId } = await createTestMenu();
      await menuService.publish(menuId, creatorId, db as any);

      const menu = await menuService.getById(menuId, inviteeId);
      const mdId = menu.dishes[0].menuDishId;
      await menuService.submitSelections(menuId, inviteeId, [mdId]);

      const summary = await menuService.getSelectionSummary(menuId, inviteeId);
      expect(summary.totalInvitees).toBe(1);
      expect(summary.completedInvitees).toBe(1);
      expect(summary.dishes.length).toBe(2);
      const selected = summary.dishes.find((d) => d.menuDishId === mdId);
      expect(selected?.selectionCount).toBe(1);
    });
  });

  describe('listMenus', () => {
    it('should list menus for creator', async () => {
      await createTestMenu();

      const result = await menuService.listMenus(creatorId, {});
      expect(result.total).toBe(1);
      expect(result.items[0].title).toBe('晚餐');
    });

    it('should list menus for invitee', async () => {
      await createTestMenu();

      const result = await menuService.listMenus(inviteeId, {});
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      await createTestMenu();
      const { id: id2 } = await createTestMenu();
      await menuService.publish(id2, creatorId, db as any);

      const drafts = await menuService.listMenus(creatorId, { status: 'draft' });
      expect(drafts.total).toBe(1);

      const published = await menuService.listMenus(creatorId, { status: 'published' });
      expect(published.total).toBe(1);
    });
  });
});

describe('NotificationService (integration)', () => {
  let db: SqliteD1Database;
  let notifService: NotificationService;
  let userId: string;

  beforeEach(async () => {
    db = createTestDb();
    notifService = new NotificationService(db as any);
    userId = await seedUser(db, { username: 'user' });
  });

  describe('create & list', () => {
    it('should create and list notifications', async () => {
      await notifService.create(userId, {
        type: 'menu_published',
        title: '新菜单',
        content: '晚餐菜单已发布',
      });

      const result = await notifService.list(userId, { page: 1, pageSize: 10 });
      expect(result.total).toBe(1);
      expect(result.items[0].title).toBe('新菜单');
      expect(result.items[0].isRead).toBe(false);
    });

    it('should respect pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await notifService.create(userId, {
          type: 'menu_published',
          title: `通知${i}`,
          content: '内容',
        });
      }

      const page1 = await notifService.list(userId, { page: 1, pageSize: 2 });
      expect(page1.items.length).toBe(2);
      expect(page1.total).toBe(5);
    });
  });

  describe('unread count', () => {
    it('should return correct unread count', async () => {
      await notifService.create(userId, { type: 'menu_published', title: 'n1', content: 'c' });
      await notifService.create(userId, { type: 'meal_ready', title: 'n2', content: 'c' });

      const count = await notifService.getUnreadCount(userId);
      expect(count).toBe(2);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      await notifService.create(userId, { type: 'menu_published', title: 'n1', content: 'c' });
      const list = await notifService.list(userId, { page: 1, pageSize: 10 });
      const notifId = list.items[0].id;

      await notifService.markAsRead(notifId, userId);

      const updated = await notifService.list(userId, { page: 1, pageSize: 10 });
      expect(updated.items[0].isRead).toBe(true);

      const count = await notifService.getUnreadCount(userId);
      expect(count).toBe(0);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      await notifService.create(userId, { type: 'menu_published', title: 'n1', content: 'c' });
      await notifService.create(userId, { type: 'meal_ready', title: 'n2', content: 'c' });

      await notifService.markAllAsRead(userId);

      const count = await notifService.getUnreadCount(userId);
      expect(count).toBe(0);
    });
  });

  describe('publish creates notifications for invitees', () => {
    it('should create notification when menu is published', async () => {
      const creatorId = await seedUser(db, { username: 'chef' });

      // Create storage and dish service for creating a dish
      const storage = createTestStorage();
      const dishService = new DishService(db as any, storage.storage as any);
      const { id: dishId } = await dishService.create({ name: '红烧肉' }, creatorId);

      const menuService = new MenuService(db as any);
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      const { id: menuId } = await menuService.createMenu(creatorId, {
        title: '今晚吃什么',
        mealType: 'dinner',
        mealTime: tomorrow,
        deadline: tomorrow,
        inviteeIds: [userId],
        dishes: [{ dishId }],
      });

      await menuService.publish(menuId, creatorId, db as any);

      const notifs = await notifService.list(userId, { page: 1, pageSize: 10 });
      expect(notifs.total).toBe(1);
      expect(notifs.items[0].title).toContain('今晚吃什么');
      expect(notifs.items[0].type).toBe('menu_published');
    });
  });
});
