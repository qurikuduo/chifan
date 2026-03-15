import { Hono } from 'hono';
import type { Env } from '../env.js';
import type { AppVariables } from '../middleware/auth.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { TagService } from '../services/dish.service.js';
import { ok, error } from '../utils/response.js';

export const tagRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();
tagRoutes.use('/*', authMiddleware);

// GET /
tagRoutes.get('/', async (c) => {
  const service = new TagService(c.env.DB);
  return ok(c, await service.list());
});

// POST / (管理员)
tagRoutes.post('/', adminMiddleware, async (c) => {
  const body = await c.req.json<{ name?: string }>();
  if (!body.name) return error(c, 'INVALID_INPUT', '请输入名称', 400);
  const service = new TagService(c.env.DB);
  return ok(c, await service.create(body.name), 201);
});

// PUT /:id (管理员)
tagRoutes.put('/:id', adminMiddleware, async (c) => {
  const id = c.req.param('id')!;
  const body = await c.req.json<{ name?: string }>();
  if (!body.name) return error(c, 'INVALID_INPUT', '请输入名称', 400);
  const service = new TagService(c.env.DB);
  await service.update(id, body.name);
  return ok(c, { message: '更新成功' });
});

// DELETE /:id (管理员)
tagRoutes.delete('/:id', adminMiddleware, async (c) => {
  const id = c.req.param('id')!;
  const service = new TagService(c.env.DB);
  await service.delete(id);
  return ok(c, { message: '已删除' });
});
