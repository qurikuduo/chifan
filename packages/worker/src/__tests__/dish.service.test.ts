import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DishService } from '../services/dish.service';
import { ServiceError } from '../services/auth.service';
import { createMockD1, createMockR2 } from './helpers/mock-d1';
import type { R2Bucket } from '../env';

describe('DishService', () => {
  let mock: ReturnType<typeof createMockD1>;
  let r2: R2Bucket;
  let service: DishService;

  beforeEach(() => {
    mock = createMockD1();
    r2 = createMockR2();
    service = new DishService(mock.db, r2);
    mock.reset();
  });

  describe('list', () => {
    it('should return empty list when no dishes', async () => {
      mock.mockFirst.mockResolvedValueOnce({ total: 0 });
      mock.mockAll.mockResolvedValueOnce({ results: [] });

      const result = await service.list({ page: 1, pageSize: 20 });
      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.page).toBe(1);
    });

    it('should calculate pagination correctly', async () => {
      mock.mockFirst.mockResolvedValueOnce({ total: 50 });
      mock.mockAll.mockResolvedValueOnce({ results: [] });

      const result = await service.list({ page: 3, pageSize: 10 });
      expect(result.pagination.totalPages).toBe(5);
      expect(result.pagination.page).toBe(3);
    });
  });

  describe('getById', () => {
    it('should throw NOT_FOUND when dish does not exist', async () => {
      mock.mockFirst.mockResolvedValueOnce(null);

      await expect(service.getById('nonexistent')).rejects.toThrow('菜品不存在');
    });

    it('should return full dish detail', async () => {
      mock.mockFirst.mockResolvedValueOnce({
        id: 'd1', name: '红烧肉', description: '经典家常菜',
        default_photo_id: null, created_by: 'u1',
        created_at: '2024-01-01', updated_at: '2024-01-01',
        user_id: 'u1', user_display_name: '爸爸',
      });
      mock.mockAll
        .mockResolvedValueOnce({ results: [] }) // photos
        .mockResolvedValueOnce({ results: [{ id: 't1', name: '家常' }] }) // tags
        .mockResolvedValueOnce({ results: [{ id: 'i1', name: '五花肉' }] }) // ingredients
        .mockResolvedValueOnce({ results: [{ id: 'cm1', name: '红烧' }] }); // cooking methods

      const dish = await service.getById('d1');
      expect(dish.name).toBe('红烧肉');
      expect(dish.tags).toHaveLength(1);
      expect(dish.ingredients).toHaveLength(1);
      expect(dish.cookingMethods).toHaveLength(1);
      expect(dish.createdByUser.displayName).toBe('爸爸');
    });
  });

  describe('create', () => {
    it('should create a dish with all fields', async () => {
      const result = await service.create({
        name: '宫保鸡丁',
        description: '四川名菜',
        pinyin: 'gong bao ji ding',
        pinyinInitial: 'gbjd',
        ingredientIds: ['i1'],
        cookingMethodIds: ['cm1'],
        tagIds: ['t1'],
      }, 'u1');

      expect(result.id).toBeDefined();
      // INSERT into dishes + batch for relations
      expect(mock.mockRun).toHaveBeenCalled();
      expect(mock.mockBatch).toHaveBeenCalled();
    });

    it('should create a dish with minimal fields', async () => {
      const result = await service.create({ name: '简单菜' }, 'u1');
      expect(result.id).toBeDefined();
      expect(mock.mockRun).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw NOT_FOUND when dish does not exist', async () => {
      mock.mockFirst.mockResolvedValueOnce(null);

      await expect(
        service.update('nonexistent', { name: '新名字' }, 'u1'),
      ).rejects.toThrow('菜品不存在');
    });

    it('should update dish name', async () => {
      mock.mockFirst.mockResolvedValueOnce({ id: 'd1', created_by: 'u1' });

      const result = await service.update('d1', { name: '新红烧肉' }, 'u1');
      expect(result.id).toBe('d1');
      expect(mock.mockRun).toHaveBeenCalled();
    });
  });

  describe('deleteDish', () => {
    it('should delete dish and R2 photos', async () => {
      mock.mockFirst.mockResolvedValueOnce({ created_by: 'u1' });
      mock.mockAll.mockResolvedValueOnce({ results: [{ id: 'p1' }, { id: 'p2' }] });

      await service.deleteDish('d1', 'u1');

      expect(r2.delete).toHaveBeenCalledTimes(2);
      expect(r2.delete).toHaveBeenCalledWith('dishes/d1/p1');
      expect(r2.delete).toHaveBeenCalledWith('dishes/d1/p2');
      expect(mock.mockBatch).toHaveBeenCalled();
    });
  });

  describe('uploadPhoto', () => {
    it('should throw NOT_FOUND when dish does not exist', async () => {
      mock.mockFirst.mockResolvedValueOnce(null);

      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
      await expect(service.uploadPhoto('nonexistent', file, 'u1')).rejects.toThrow('菜品不存在');
    });

    it('should throw when file too large', async () => {
      mock.mockFirst.mockResolvedValueOnce({ created_by: 'u1' });

      const bigContent = new Uint8Array(6 * 1024 * 1024);
      const file = new File([bigContent], 'big.jpg', { type: 'image/jpeg' });
      await expect(service.uploadPhoto('d1', file, 'u1')).rejects.toThrow('图片大小不能超过5MB');
    });

    it('should throw when file type not allowed', async () => {
      mock.mockFirst.mockResolvedValueOnce({ created_by: 'u1' });

      const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
      await expect(service.uploadPhoto('d1', file, 'u1')).rejects.toThrow('只支持 JPG/PNG/WebP 格式');
    });
  });

  describe('setDefaultPhoto', () => {
    it('should throw when photo not found', async () => {
      mock.mockFirst.mockResolvedValueOnce({ created_by: 'u1' });
      mock.mockFirst.mockResolvedValueOnce(null);

      await expect(service.setDefaultPhoto('d1', 'p999', 'u1')).rejects.toThrow('照片不存在');
    });
  });

  describe('deletePhoto', () => {
    it('should throw when photo not found', async () => {
      mock.mockFirst.mockResolvedValueOnce({ created_by: 'u1' });
      mock.mockFirst.mockResolvedValueOnce(null);

      await expect(service.deletePhoto('d1', 'p999', 'u1')).rejects.toThrow('照片不存在');
    });
  });

  describe('clone', () => {
    it('should clone a dish with overrides', async () => {
      // getById mock chain
      mock.mockFirst.mockResolvedValueOnce({
        id: 'd1', name: '原版红烧肉', description: '经典做法',
        default_photo_id: null, created_by: 'u1',
        created_at: '2024-01-01', updated_at: '2024-01-01',
        user_id: 'u1', user_display_name: '爸爸',
      });
      mock.mockAll
        .mockResolvedValueOnce({ results: [] }) // photos
        .mockResolvedValueOnce({ results: [{ id: 't1', name: '家常' }] }) // tags
        .mockResolvedValueOnce({ results: [{ id: 'i1', name: '五花肉' }] }) // ingredients
        .mockResolvedValueOnce({ results: [{ id: 'cm1', name: '红烧' }] }); // cooking methods

      const result = await service.clone('d1', {
        name: '红烧肉（甜口版）',
        description: '加了更多糖',
      }, 'u2');

      expect(result.id).toBeDefined();
      expect(result.id).not.toBe('d1');
      // Should have run INSERT for new dish + batch for relations
      expect(mock.mockRun).toHaveBeenCalled();
      expect(mock.mockBatch).toHaveBeenCalled();
    });
  });

  describe('searchForMenu', () => {
    it('should return dishes with usage stats', async () => {
      mock.mockAll.mockResolvedValueOnce({
        results: [
          {
            id: 'd1', name: '红烧肉', description: '好吃',
            pinyin: 'hong shao rou', default_photo_id: null,
            created_at: '2024-01-01', selection_count: 5,
            last_used_at: '2024-06-01',
          },
        ],
      });

      const results = await service.searchForMenu('红烧');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('红烧肉');
      expect(results[0].selectionCount).toBe(5);
      expect(results[0].lastUsedAt).toBe('2024-06-01');
    });
  });

  describe('getFavorites', () => {
    it('should return user favorite dishes', async () => {
      mock.mockAll.mockResolvedValueOnce({
        results: [
          { id: 'd1', name: '红烧肉', description: null, default_photo_id: null, selection_count: 10 },
          { id: 'd2', name: '蒸蛋', description: null, default_photo_id: null, selection_count: 8 },
        ],
      });

      const results = await service.getFavorites('u1', 5);
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('红烧肉');
      expect(results[0].selectionCount).toBe(10);
    });
  });

  describe('getAllFavorites', () => {
    it('should return favorites grouped by user', async () => {
      mock.mockAll.mockResolvedValueOnce({
        results: [
          { user_id: 'u1', display_name: '爸爸', dish_id: 'd1', dish_name: '红烧肉', selection_count: 10 },
          { user_id: 'u1', display_name: '爸爸', dish_id: 'd2', dish_name: '蒸蛋', selection_count: 5 },
          { user_id: 'u2', display_name: '妈妈', dish_id: 'd3', dish_name: '鱼香肉丝', selection_count: 8 },
        ],
      });

      const results = await service.getAllFavorites(5);
      expect(results).toHaveLength(2);
      expect(results[0].displayName).toBe('爸爸');
      expect(results[0].dishes).toHaveLength(2);
      expect(results[1].displayName).toBe('妈妈');
      expect(results[1].dishes).toHaveLength(1);
    });
  });
});
