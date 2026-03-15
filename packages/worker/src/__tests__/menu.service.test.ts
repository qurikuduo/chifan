import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MenuService, NotificationService } from '../services/menu.service';
import { ServiceError } from '../services/auth.service';
import { createMockD1 } from './helpers/mock-d1';

describe('MenuService', () => {
  let mock: ReturnType<typeof createMockD1>;
  let service: MenuService;

  beforeEach(() => {
    mock = createMockD1();
    service = new MenuService(mock.db);
    mock.reset();
  });

  describe('listMenus', () => {
    it('should return paginated menus', async () => {
      mock.mockFirst.mockResolvedValueOnce({ total: 2 });
      mock.mockAll.mockResolvedValueOnce({
        results: [
          {
            id: 'm1', title: '周末大餐', meal_type: 'dinner',
            meal_time: '2024-06-01', deadline: '2024-05-30',
            status: 'draft', created_by: 'u1', created_at: '2024-05-28',
            creator_display_name: '爸爸', creator_family_role: '爸爸',
            dish_count: 3, total_invitees: 2, completed_invitees: 0,
          },
        ],
      });

      const result = await service.listMenus('u1', { page: 1, pageSize: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('周末大餐');
      expect(result.items[0].dishCount).toBe(3);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      mock.mockFirst.mockResolvedValueOnce({ total: 0 });
      mock.mockAll.mockResolvedValueOnce({ results: [] });

      const result = await service.listMenus('u1', { status: 'published' });
      expect(result.items).toHaveLength(0);
      // Verify status parameter was bound
      expect(mock.mockBind).toHaveBeenCalled();
    });
  });

  describe('createMenu', () => {
    it('should create a menu successfully', async () => {
      const result = await service.createMenu('u1', {
        title: '测试菜单',
        mealType: 'dinner',
        mealTime: '2024-06-01',
        deadline: '2024-05-30',
        inviteeIds: ['u2', 'u3'],
      });

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      // menu insert + creator insert + batch invitees
      expect(mock.mockRun).toHaveBeenCalled();
    });

    it('should handle dishes and collaborators', async () => {
      const result = await service.createMenu('u1', {
        title: '大聚餐',
        mealType: 'lunch',
        mealTime: '2024-06-01',
        deadline: '2024-05-30',
        inviteeIds: ['u2'],
        collaboratorIds: ['u3'],
        dishes: [{ dishId: 'd1', sortOrder: 0 }],
      });

      expect(result.id).toBeDefined();
      // Should batch collaborators, invitees, and dishes
      expect(mock.mockBatch).toHaveBeenCalled();
    });
  });

  describe('deleteMenu', () => {
    it('should throw when menu is not draft', async () => {
      // ensureCreatorAccess mock
      mock.mockFirst
        .mockResolvedValueOnce({ user_id: 'u1' })  // creator check
        .mockResolvedValueOnce({ id: 'm1', status: 'published', title: '已发布' }); // getMenuRow

      await expect(service.deleteMenu('m1', 'u1')).rejects.toThrow('只能删除草稿状态的菜单');
    });
  });

  describe('addDish', () => {
    it('should throw DUPLICATE when dish already in menu', async () => {
      // ensureCreatorAccess mock
      mock.mockFirst
        .mockResolvedValueOnce({ user_id: 'u1' })  // creator check
        .mockResolvedValueOnce({ id: 1 }); // dish exists check

      await expect(
        service.addDish('m1', 'u1', { dishId: 'd1' }),
      ).rejects.toThrow('该菜品已在菜单中');
    });
  });

  describe('status transitions', () => {
    it('publish should throw when no dishes', async () => {
      // ensureCreatorAccess + getMenuRow
      mock.mockFirst
        .mockResolvedValueOnce({ user_id: 'u1' })  // creator check
        .mockResolvedValueOnce({ id: 'm1', status: 'draft', title: '测试' }) // getMenuRow
        .mockResolvedValueOnce({ cnt: 0 }); // dish count

      await expect(service.publish('m1', 'u1', mock.db)).rejects.toThrow('至少需要添加一道菜品');
    });

    it('publish should throw when no invitees', async () => {
      mock.mockFirst
        .mockResolvedValueOnce({ user_id: 'u1' })
        .mockResolvedValueOnce({ id: 'm1', status: 'draft', title: '测试' })
        .mockResolvedValueOnce({ cnt: 3 })   // has dishes
        .mockResolvedValueOnce({ cnt: 0 });  // no invitees

      await expect(service.publish('m1', 'u1', mock.db)).rejects.toThrow('至少需要邀请一位家人');
    });

    it('closeSelection should throw when not published', async () => {
      mock.mockFirst
        .mockResolvedValueOnce({ user_id: 'u1' })
        .mockResolvedValueOnce({ id: 'm1', status: 'draft', title: '测试' });

      await expect(service.closeSelection('m1', 'u1')).rejects.toThrow('只能关闭选菜中的菜单');
    });

    it('startCooking should throw when not selection_closed', async () => {
      mock.mockFirst
        .mockResolvedValueOnce({ user_id: 'u1' })
        .mockResolvedValueOnce({ id: 'm1', status: 'published', title: '测试' });

      await expect(service.startCooking('m1', 'u1')).rejects.toThrow('只能在选菜结束后开始烹饪');
    });

    it('complete should throw when not cooking', async () => {
      mock.mockFirst
        .mockResolvedValueOnce({ user_id: 'u1' })
        .mockResolvedValueOnce({ id: 'm1', status: 'selection_closed', title: '测试' });

      await expect(service.complete('m1', 'u1', mock.db)).rejects.toThrow('只能在烹饪中完成菜单');
    });
  });

  describe('submitSelections', () => {
    it('should throw when menu is not published', async () => {
      mock.mockFirst.mockResolvedValueOnce({ id: 'm1', status: 'draft', deadline: '2099-12-31' });

      await expect(
        service.submitSelections('m1', 'u1', ['md1']),
      ).rejects.toThrow('当前菜单不在选菜阶段');
    });

    it('should throw when deadline passed', async () => {
      mock.mockFirst.mockResolvedValueOnce({
        id: 'm1', status: 'published', deadline: '2020-01-01',
      });

      await expect(
        service.submitSelections('m1', 'u1', ['md1']),
      ).rejects.toThrow('选菜截止时间已过');
    });

    it('should throw FORBIDDEN when user is not invitee', async () => {
      mock.mockFirst
        .mockResolvedValueOnce({ id: 'm1', status: 'published', deadline: '2099-12-31' })
        .mockResolvedValueOnce(null); // not an invitee

      await expect(
        service.submitSelections('m1', 'u1', ['md1']),
      ).rejects.toThrow('你不在该菜单的邀请名单中');
    });
  });
});

describe('NotificationService', () => {
  let mock: ReturnType<typeof createMockD1>;
  let service: NotificationService;

  beforeEach(() => {
    mock = createMockD1();
    service = new NotificationService(mock.db);
    mock.reset();
  });

  describe('list', () => {
    it('should return paginated notifications', async () => {
      mock.mockFirst.mockResolvedValueOnce({ total: 5 });
      mock.mockAll.mockResolvedValueOnce({
        results: [
          { id: 'n1', type: 'menu_published', title: '新菜单', content: '快来选菜', related_menu_id: 'm1', is_read: 0, created_at: '2024-01-01' },
        ],
      });

      const result = await service.list('u1', { page: 1, pageSize: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].isRead).toBe(false);
      expect(result.total).toBe(5);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count', async () => {
      mock.mockFirst.mockResolvedValueOnce({ cnt: 3 });

      const count = await service.getUnreadCount('u1');
      expect(count).toBe(3);
    });
  });

  describe('markAsRead', () => {
    it('should work without error', async () => {
      await expect(service.markAsRead('n1', 'u1')).resolves.not.toThrow();
      expect(mock.mockRun).toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should work without error', async () => {
      await expect(service.markAllAsRead('u1')).resolves.not.toThrow();
    });
  });

  describe('create', () => {
    it('should create a notification', async () => {
      await service.create('u1', {
        type: 'menu_published',
        title: '新菜单发布',
        content: '快来看看',
        relatedMenuId: 'm1',
      });

      expect(mock.mockRun).toHaveBeenCalled();
    });
  });
});
