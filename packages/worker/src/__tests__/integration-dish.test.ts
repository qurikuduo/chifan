/**
 * Integration tests for DishService using real SQLite.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestDb,
  createTestStorage,
  seedUser,
  seedTag,
  seedIngredient,
  seedCookingMethod,
  seedCategory,
} from './helpers/test-db.js';
import { DishService } from '../services/dish.service.js';
import { ServiceError } from '../services/auth.service.js';
import { SqliteD1Database } from '../adapters/sqlite.js';

describe('DishService (integration)', () => {
  let db: SqliteD1Database;
  let storage: ReturnType<typeof createTestStorage>;
  let dishService: DishService;
  let userId: string;

  beforeEach(async () => {
    db = createTestDb();
    storage = createTestStorage();
    dishService = new DishService(db as any, storage.storage as any);
    userId = await seedUser(db, { username: 'chef', displayName: '大厨' });
  });

  describe('create & getById', () => {
    it('should create a dish and retrieve it', async () => {
      const { id } = await dishService.create(
        { name: '红烧肉', description: '经典家常菜', pinyin: 'hongshaorou', pinyinInitial: 'hsr' },
        userId,
      );

      const dish = await dishService.getById(id);
      expect(dish.name).toBe('红烧肉');
      expect(dish.description).toBe('经典家常菜');
      expect(dish.createdByUser.displayName).toBe('大厨');
      expect(dish.tags).toEqual([]);
      expect(dish.ingredients).toEqual([]);
      expect(dish.cookingMethods).toEqual([]);
    });

    it('should create a dish with tags, ingredients, and cooking methods', async () => {
      const tagId = await seedTag(db, '家常菜');
      const catId = await seedCategory(db, '肉类');
      const ingId = await seedIngredient(db, '五花肉', catId);
      const methodId = await seedCookingMethod(db, '红烧');

      const { id } = await dishService.create(
        {
          name: '红烧肉',
          tagIds: [tagId],
          ingredientIds: [ingId],
          cookingMethodIds: [methodId],
        },
        userId,
      );

      const dish = await dishService.getById(id);
      expect(dish.tags.length).toBe(1);
      expect(dish.tags[0].name).toBe('家常菜');
      expect(dish.ingredients.length).toBe(1);
      expect(dish.ingredients[0].name).toBe('五花肉');
      expect(dish.cookingMethods.length).toBe(1);
      expect(dish.cookingMethods[0].name).toBe('红烧');
    });
  });

  describe('update', () => {
    it('should update dish name and description', async () => {
      const { id } = await dishService.create({ name: '测试菜', description: '旧描述' }, userId);

      await dishService.update(id, { name: '新菜名', description: '新描述' }, userId);
      const dish = await dishService.getById(id);
      expect(dish.name).toBe('新菜名');
      expect(dish.description).toBe('新描述');
    });

    it('should update relations (replace tags)', async () => {
      const tag1 = await seedTag(db, '川菜');
      const tag2 = await seedTag(db, '粤菜');
      const { id } = await dishService.create({ name: '测试菜', tagIds: [tag1] }, userId);

      await dishService.update(id, { tagIds: [tag2] }, userId);
      const dish = await dishService.getById(id);
      expect(dish.tags.length).toBe(1);
      expect(dish.tags[0].name).toBe('粤菜');
    });

    it('should throw NOT_FOUND for nonexistent dish', async () => {
      await expect(
        dishService.update('nonexistent', { name: 'x' }, userId),
      ).rejects.toThrow(ServiceError);
    });
  });

  describe('delete', () => {
    it('should delete dish and its relations', async () => {
      const tagId = await seedTag(db, '家常菜');
      const { id } = await dishService.create({ name: '要删除的菜', tagIds: [tagId] }, userId);

      await dishService.deleteDish(id);

      await expect(dishService.getById(id)).rejects.toThrow('菜品不存在');

      // Verify junction rows cleaned up
      const tagRow = await db
        .prepare('SELECT COUNT(*) as c FROM dish_tags WHERE dish_id = ?')
        .bind(id)
        .first<{ c: number }>();
      expect(tagRow!.c).toBe(0);
    });
  });

  describe('list', () => {
    it('should return paginated dishes', async () => {
      for (let i = 0; i < 5; i++) {
        await dishService.create({ name: `菜品${i}` }, userId);
      }

      const result = await dishService.list({ page: 1, pageSize: 2 });
      expect(result.data.length).toBe(2);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should filter by keyword (name)', async () => {
      await dishService.create({ name: '红烧肉', pinyin: 'hongshaorou' }, userId);
      await dishService.create({ name: '清蒸鱼', pinyin: 'qingzhengyu' }, userId);

      const result = await dishService.list({ keyword: '红烧', page: 1, pageSize: 10 });
      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('红烧肉');
    });

    it('should filter by pinyin keyword', async () => {
      await dishService.create({ name: '红烧肉', pinyin: 'hongshaorou', pinyinInitial: 'hsr' }, userId);
      await dishService.create({ name: '清蒸鱼', pinyin: 'qingzhengyu', pinyinInitial: 'qzy' }, userId);

      const result = await dishService.list({ keyword: 'hsr', page: 1, pageSize: 10 });
      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('红烧肉');
    });

    it('should filter by tag', async () => {
      const tag1 = await seedTag(db, '川菜');
      const tag2 = await seedTag(db, '粤菜');
      await dishService.create({ name: '麻婆豆腐', tagIds: [tag1] }, userId);
      await dishService.create({ name: '白切鸡', tagIds: [tag2] }, userId);

      const result = await dishService.list({ tagId: tag1, page: 1, pageSize: 10 });
      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('麻婆豆腐');
    });

    it('should filter by ingredient', async () => {
      const ing1 = await seedIngredient(db, '豆腐');
      const ing2 = await seedIngredient(db, '鸡肉');
      await dishService.create({ name: '麻婆豆腐', ingredientIds: [ing1] }, userId);
      await dishService.create({ name: '白切鸡', ingredientIds: [ing2] }, userId);

      const result = await dishService.list({ ingredientId: ing1, page: 1, pageSize: 10 });
      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('麻婆豆腐');
    });

    it('should filter by cooking method', async () => {
      const cm1 = await seedCookingMethod(db, '炒');
      const cm2 = await seedCookingMethod(db, '蒸');
      await dishService.create({ name: '炒青菜', cookingMethodIds: [cm1] }, userId);
      await dishService.create({ name: '蒸鱼', cookingMethodIds: [cm2] }, userId);

      const result = await dishService.list({ cookingMethodId: cm1, page: 1, pageSize: 10 });
      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('炒青菜');
    });
  });

  describe('searchForMenu', () => {
    it('should search by name keyword', async () => {
      await dishService.create({ name: '红烧肉', pinyin: 'hongshaorou' }, userId);
      await dishService.create({ name: '清蒸鱼', pinyin: 'qingzhengyu' }, userId);

      const results = await dishService.searchForMenu('红烧');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('红烧肉');
    });

    it('should search by pinyin', async () => {
      await dishService.create({ name: '红烧肉', pinyin: 'hongshaorou', pinyinInitial: 'hsr' }, userId);

      const results = await dishService.searchForMenu('hsr');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('红烧肉');
    });
  });

  describe('clone', () => {
    it('should clone a dish with all relations', async () => {
      const tagId = await seedTag(db, '家常菜');
      const ingId = await seedIngredient(db, '五花肉');
      const methodId = await seedCookingMethod(db, '红烧');

      const { id: origId } = await dishService.create(
        { name: '红烧肉', description: '经典', tagIds: [tagId], ingredientIds: [ingId], cookingMethodIds: [methodId] },
        userId,
      );

      const { id: cloneId } = await dishService.clone(origId, { name: '改良红烧肉' }, userId);

      const cloned = await dishService.getById(cloneId);
      expect(cloned.name).toBe('改良红烧肉');
      expect(cloned.description).toBe('经典');
      expect(cloned.tags.length).toBe(1);
      expect(cloned.ingredients.length).toBe(1);
      expect(cloned.cookingMethods.length).toBe(1);
    });
  });

  describe('favorites', () => {
    it('should return empty when no selections', async () => {
      const favs = await dishService.getFavorites(userId);
      expect(favs).toEqual([]);
    });
  });

  describe('setDefaultPhoto & deletePhoto', () => {
    it('should throw NOT_FOUND for setting non-existent photo as default', async () => {
      const { id } = await dishService.create({ name: '测试菜' }, userId);
      await expect(dishService.setDefaultPhoto(id, 'nonexistent')).rejects.toThrow('照片不存在');
    });

    it('should throw NOT_FOUND for deleting non-existent photo', async () => {
      const { id } = await dishService.create({ name: '测试菜' }, userId);
      await expect(dishService.deletePhoto(id, 'nonexistent')).rejects.toThrow('照片不存在');
    });
  });
});
