import { Hono } from 'hono';
import type { Env } from '../env.js';
import type { AppVariables } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { DishService } from '../services/dish.service.js';
import { ok, error, parsePagination } from '../utils/response.js';

export const dishRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();
dishRoutes.use('/*', authMiddleware);

// GET /search - 搜索菜品（用于菜单创建，带使用统计）
dishRoutes.get('/search', async (c) => {
  const keyword = c.req.query('q') ?? '';
  const limit = Math.min(30, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
  const service = new DishService(c.env.DB, c.env.PHOTOS);
  const result = await service.searchForMenu(keyword, limit);
  return ok(c, result);
});

// GET /favorites - 获取当前用户最爱菜品
dishRoutes.get('/favorites', async (c) => {
  const user = c.get('user');
  const limit = Math.min(30, Math.max(1, parseInt(c.req.query('limit') || '10', 10)));
  const service = new DishService(c.env.DB, c.env.PHOTOS);
  const result = await service.getFavorites(user.sub, limit);
  return ok(c, result);
});

// GET /favorites/all - 获取所有家人最爱菜品
dishRoutes.get('/favorites/all', async (c) => {
  const limit = Math.min(20, Math.max(1, parseInt(c.req.query('limit') || '5', 10)));
  const service = new DishService(c.env.DB, c.env.PHOTOS);
  const result = await service.getAllFavorites(limit);
  return ok(c, result);
});

// GET / - 获取菜品列表
dishRoutes.get('/', async (c) => {
  const { page, pageSize } = parsePagination(c);
  const keyword = c.req.query('keyword');
  const tagId = c.req.query('tagId');
  const ingredientId = c.req.query('ingredientId');
  const cookingMethodId = c.req.query('cookingMethodId');
  const service = new DishService(c.env.DB, c.env.PHOTOS);
  const result = await service.list({ keyword, tagId, ingredientId, cookingMethodId, page, pageSize });
  return ok(c, result);
});

// GET /:dishId - 获取单个菜品
dishRoutes.get('/:dishId', async (c) => {
  const dishId = c.req.param('dishId')!;
  const service = new DishService(c.env.DB, c.env.PHOTOS);
  const dish = await service.getById(dishId);
  return ok(c, dish);
});

// POST / - 新增菜品
dishRoutes.post('/', async (c) => {
  const body = await c.req.json<{ name?: string; description?: string; pinyin?: string; pinyinInitial?: string; ingredientIds?: string[]; cookingMethodIds?: string[]; tagIds?: string[] }>();
  if (!body.name) return error(c, 'INVALID_INPUT', '请输入菜品名称', 400);

  const user = c.get('user');
  const service = new DishService(c.env.DB, c.env.PHOTOS);
  const result = await service.create({
    name: body.name,
    description: body.description,
    pinyin: body.pinyin,
    pinyinInitial: body.pinyinInitial,
    ingredientIds: body.ingredientIds,
    cookingMethodIds: body.cookingMethodIds,
    tagIds: body.tagIds,
  }, user.sub);

  return ok(c, result, 201);
});

// PUT /:dishId - 更新菜品
dishRoutes.put('/:dishId', async (c) => {
  const dishId = c.req.param('dishId')!;
  const body = await c.req.json<{ name?: string; description?: string; pinyin?: string; pinyinInitial?: string; ingredientIds?: string[]; cookingMethodIds?: string[]; tagIds?: string[]; defaultPhotoId?: string }>();
  const user = c.get('user');
  const service = new DishService(c.env.DB, c.env.PHOTOS);
  const result = await service.update(dishId, body, user.sub, user.isAdmin);
  return ok(c, result);
});

// POST /:dishId/clone - 克隆菜品创建变体
dishRoutes.post('/:dishId/clone', async (c) => {
  const dishId = c.req.param('dishId')!;
  const body = await c.req.json<{ name?: string; description?: string; pinyin?: string; pinyinInitial?: string }>();
  const user = c.get('user');
  const service = new DishService(c.env.DB, c.env.PHOTOS);
  const result = await service.clone(dishId, body, user.sub);
  return ok(c, result, 201);
});

// DELETE /:dishId - 删除菜品
dishRoutes.delete('/:dishId', async (c) => {
  const dishId = c.req.param('dishId')!;
  const user = c.get('user');
  const service = new DishService(c.env.DB, c.env.PHOTOS);
  await service.deleteDish(dishId, user.sub, user.isAdmin);
  return ok(c, { message: '已删除' });
});

// POST /:dishId/photos - 上传照片
dishRoutes.post('/:dishId/photos', async (c) => {
  const dishId = c.req.param('dishId')!;
  const user = c.get('user');
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return error(c, 'INVALID_INPUT', '请选择图片文件', 400);

  const service = new DishService(c.env.DB, c.env.PHOTOS);
  const result = await service.uploadPhoto(dishId, file, user.sub, user.isAdmin);
  return ok(c, result, 201);
});

// PUT /:dishId/default-photo - 设置默认照片
dishRoutes.put('/:dishId/default-photo', async (c) => {
  const dishId = c.req.param('dishId')!;
  const user = c.get('user');
  const body = await c.req.json<{ photoId?: string }>();
  if (!body.photoId) return error(c, 'INVALID_INPUT', '请指定照片ID', 400);

  const service = new DishService(c.env.DB, c.env.PHOTOS);
  await service.setDefaultPhoto(dishId, body.photoId, user.sub, user.isAdmin);
  return ok(c, { message: '已设置' });
});

// DELETE /:dishId/photos/:photoId - 删除照片
dishRoutes.delete('/:dishId/photos/:photoId', async (c) => {
  const dishId = c.req.param('dishId')!;
  const photoId = c.req.param('photoId')!;
  const user = c.get('user');
  const service = new DishService(c.env.DB, c.env.PHOTOS);
  await service.deletePhoto(dishId, photoId, user.sub, user.isAdmin);
  return ok(c, { message: '已删除' });
});
