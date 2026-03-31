import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env.js';
import { ServiceError } from './services/auth.service.js';
import { apiLimiter, authLimiter, uploadLimiter } from './middleware/rate-limit.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { dishRoutes } from './routes/dishes.js';
import { ingredientRoutes } from './routes/ingredients.js';
import { cookingMethodRoutes } from './routes/cooking-methods.js';
import { tagRoutes } from './routes/tags.js';
import { menuRoutes } from './routes/menus.js';
import { selectionRoutes } from './routes/selections.js';
import { notificationRoutes } from './routes/notifications.js';
import { pollRoutes } from './routes/poll.js';
import { ingredientCategoryRoutes } from './routes/ingredient-categories.js';
import { uploadRoutes } from './routes/uploads.js';
import { docsRoutes } from './routes/docs.js';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('/*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });
  return corsMiddleware(c, next);
});

// Health check
app.get('/api/v1/health', (c) => c.json({ status: 'ok' }));

// Rate limiting
app.use('/api/v1/auth/*', authLimiter);
app.use('/api/v1/uploads/*', uploadLimiter);
app.use('/api/v1/*', apiLimiter);

// Routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/dishes', dishRoutes);
app.route('/api/v1/ingredients', ingredientRoutes);
app.route('/api/v1/ingredient-categories', ingredientCategoryRoutes);
app.route('/api/v1/cooking-methods', cookingMethodRoutes);
app.route('/api/v1/tags', tagRoutes);
app.route('/api/v1/menus', menuRoutes);
app.route('/api/v1/notifications', notificationRoutes);
app.route('/api/v1/poll', pollRoutes);
app.route('/api/v1/uploads', uploadRoutes);
app.route('/api/v1/docs', docsRoutes);

// 404
app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: '接口不存在' } }, 404));

// Global error handler
app.onError((err, c) => {
  if (err instanceof ServiceError) {
    return c.json(
      { error: { code: err.code, message: err.message } },
      err.status as 400 | 401 | 403 | 404 | 409 | 500,
    );
  }
  console.error(err);
  return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
});

export default app;
