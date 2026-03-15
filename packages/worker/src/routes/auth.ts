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

  if (body.username.length > 30 || !/^[a-zA-Z0-9_]+$/.test(body.username)) {
    return error(c, 'INVALID_INPUT', '用户名只能包含字母、数字和下划线，最长30个字符', 400);
  }

  if (body.email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return error(c, 'INVALID_INPUT', '请输入有效的邮箱地址', 400);
  }

  if (body.displayName.length > 50) {
    return error(c, 'INVALID_INPUT', '昵称不能超过50个字符', 400);
  }

  if (body.password.length < 8) {
    return error(c, 'INVALID_INPUT', '密码长度不能少于8个字符', 400);
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
