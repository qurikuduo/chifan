import { Hono } from 'hono';
import type { Env } from '../env.js';
import type { AppVariables } from '../middleware/auth.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { IngredientService } from '../services/dish.service.js';
import { ok, error } from '../utils/response.js';

export const ingredientRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();
ingredientRoutes.use('/*', authMiddleware);

// GET / - 搜索原材料
ingredientRoutes.get('/', async (c) => {
  const keyword = c.req.query('keyword');
  const categoryId = c.req.query('categoryId');
  const service = new IngredientService(c.env.DB);
  const result = await service.search(keyword, categoryId);
  return ok(c, result);
});

// GET /grouped - 按分类分组获取
ingredientRoutes.get('/grouped', async (c) => {
  const service = new IngredientService(c.env.DB);
  const result = await service.grouped();
  return ok(c, result);
});

// POST / - 新增原材料（管理员）
ingredientRoutes.post('/', adminMiddleware, async (c) => {
  const body = await c.req.json<{ name?: string; categoryId?: string }>();
  if (!body.name) return error(c, 'INVALID_INPUT', '请输入名称', 400);
  const service = new IngredientService(c.env.DB);
  const result = await service.create(body.name, body.categoryId);
  return ok(c, result, 201);
});

// PUT /:id - 更新原材料（管理员）
ingredientRoutes.put('/:id', adminMiddleware, async (c) => {
  const id = c.req.param('id')!;
  const body = await c.req.json<{ name?: string; categoryId?: string }>();
  const service = new IngredientService(c.env.DB);
  await service.update(id, body);
  return ok(c, { message: '更新成功' });
});

// DELETE /:id - 删除原材料（管理员）
ingredientRoutes.delete('/:id', adminMiddleware, async (c) => {
  const id = c.req.param('id')!;
  const service = new IngredientService(c.env.DB);
  await service.delete(id);
  return ok(c, { message: '已删除' });
});
