import { Hono } from 'hono';
import type { Env } from '../env.js';
import type { AppVariables } from '../middleware/auth.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { IngredientCategoryService } from '../services/dish.service.js';
import { ok, error } from '../utils/response.js';

export const ingredientCategoryRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();
ingredientCategoryRoutes.use('/*', authMiddleware);

// GET / - 获取所有分类
ingredientCategoryRoutes.get('/', async (c) => {
  const service = new IngredientCategoryService(c.env.DB);
  const result = await service.list();
  return ok(c, result);
});

// POST / - 新增分类（管理员）
ingredientCategoryRoutes.post('/', adminMiddleware, async (c) => {
  const body = await c.req.json<{ name?: string; sortOrder?: number }>();
  if (!body.name) return error(c, 'INVALID_INPUT', '请输入名称', 400);
  const service = new IngredientCategoryService(c.env.DB);
  const result = await service.create(body.name, body.sortOrder);
  return ok(c, result, 201);
});

// PUT /:id - 更新分类（管理员）
ingredientCategoryRoutes.put('/:id', adminMiddleware, async (c) => {
  const id = c.req.param('id')!;
  const body = await c.req.json<{ name?: string; sortOrder?: number }>();
  const service = new IngredientCategoryService(c.env.DB);
  await service.update(id, body);
  return ok(c, { message: '更新成功' });
});

// DELETE /:id - 删除分类（管理员）
ingredientCategoryRoutes.delete('/:id', adminMiddleware, async (c) => {
  const id = c.req.param('id')!;
  const service = new IngredientCategoryService(c.env.DB);
  await service.delete(id);
  return ok(c, { message: '已删除' });
});
