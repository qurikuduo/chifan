import { Hono } from 'hono';
import type { Env } from '../env.js';
import type { AppVariables } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { NotificationService } from '../services/menu.service.js';

export const pollRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

pollRoutes.use('/*', authMiddleware);

// GET / - 轮询新消息
pollRoutes.get('/', async (c) => {
  const user = c.get('user');
  const since = c.req.query('since');
  const svc = new NotificationService(c.env.DB);

  // Get recent notifications since the given timestamp
  const unreadCount = await svc.getUnreadCount(user.sub);

  let notifications: unknown[] = [];
  if (since) {
    const db = c.env.DB;
    const rows = await db
      .prepare(
        `SELECT * FROM notifications
         WHERE user_id = ? AND created_at > ?
         ORDER BY created_at DESC LIMIT 20`,
      )
      .bind(user.sub, since)
      .all();

    notifications = (rows.results ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      content: r.content,
      relatedMenuId: r.related_menu_id,
      isRead: !!r.is_read,
      createdAt: r.created_at,
    }));
  }

  return c.json({
    notifications,
    unreadCount,
    serverTime: new Date().toISOString(),
  });
});
