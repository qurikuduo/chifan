import { Hono } from 'hono';
import type { Env } from '../env.js';
import type { AppVariables } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthService, ServiceError } from '../services/auth.service.js';
import { ok, error } from '../utils/response.js';

export const authRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// POST /register
authRoutes.post('/register', async (c) => {
  const body = await c.req.json<{ username?: string; email?: string; password?: string; displayName?: string }>();

  if (!body.username || !body.email || !body.password || !body.displayName) {
    return error(c, 'INVALID_INPUT', '请填写所有必填字段', 400);
  }

  if (body.password.length < 6) {
    return error(c, 'INVALID_INPUT', '密码长度不能少于6个字符', 400);
  }

  const service = new AuthService(c.env.DB, c.env.JWT_SECRET);
  await service.register({
    username: body.username,
    email: body.email,
    password: body.password,
    displayName: body.displayName,
  });

  return ok(c, { message: '注册成功，请等待管理员审批' }, 201);
});

// POST /login
authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ login?: string; password?: string }>();

  if (!body.login || !body.password) {
    return error(c, 'INVALID_INPUT', '请输入用户名和密码', 400);
  }

  const service = new AuthService(c.env.DB, c.env.JWT_SECRET);
  const result = await service.login({ login: body.login, password: body.password });

  return ok(c, result);
});

// POST /logout (stateless JWT, client-side token removal)
authRoutes.post('/logout', authMiddleware, async (c) => {
  return ok(c, { message: '已退出登录' });
});

// GET /me
authRoutes.get('/me', authMiddleware, async (c) => {
  const authUser = c.get('user');
  const service = new AuthService(c.env.DB, c.env.JWT_SECRET);
  const user = await service.getUser(authUser.sub);
  return ok(c, user);
});
