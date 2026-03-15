import { Hono } from 'hono';
import type { Env } from '../env.js';
import type { AppVariables } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { NotificationService } from '../services/menu.service.js';

export const notificationRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

notificationRoutes.use('/*', authMiddleware);

// GET / - 获取通知列表
notificationRoutes.get('/', async (c) => {
  const user = c.get('user');
  const page = Number(c.req.query('page') ?? '1');
  const pageSize = Number(c.req.query('pageSize') ?? '20');
  const svc = new NotificationService(c.env.DB);
  const result = await svc.list(user.sub, { page, pageSize });
  return c.json(result);
});

// GET /unread-count - 获取未读数量
notificationRoutes.get('/unread-count', async (c) => {
  const user = c.get('user');
  const svc = new NotificationService(c.env.DB);
  const count = await svc.getUnreadCount(user.sub);
  return c.json({ count });
});

// PUT /read-all - 全部已读
notificationRoutes.put('/read-all', async (c) => {
  const user = c.get('user');
  const svc = new NotificationService(c.env.DB);
  await svc.markAllAsRead(user.sub);
  return c.json({ success: true });
});

// PUT /:notificationId/read - 标记已读
notificationRoutes.put('/:notificationId/read', async (c) => {
  const user = c.get('user');
  const notificationId = c.req.param('notificationId')!;
  const svc = new NotificationService(c.env.DB);
  await svc.markAsRead(notificationId, user.sub);
  return c.json({ success: true });
});
