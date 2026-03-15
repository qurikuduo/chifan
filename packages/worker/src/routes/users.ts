import { Hono } from 'hono';
import type { Env } from '../env.js';
import type { AppVariables } from '../middleware/auth.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { UserService, ServiceError } from '../services/auth.service.js';
import { ok, error, parsePagination } from '../utils/response.js';

export const userRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// 所有用户路由都需要认证
userRoutes.use('/*', authMiddleware);

// GET / - 获取所有用户（管理员）
userRoutes.get('/', adminMiddleware, async (c) => {
  const { page, pageSize } = parsePagination(c);
  const status = c.req.query('status');
  const service = new UserService(c.env.DB);
  const result = await service.listUsers(status, page, pageSize);
  return ok(c, result);
});

// GET /family-members - 获取所有已审批家庭成员
userRoutes.get('/family-members', async (c) => {
  const service = new UserService(c.env.DB);
  const members = await service.getFamilyMembers();
  return ok(c, members);
});

// GET /me/preferences - 获取我的饮食偏好
userRoutes.get('/me/preferences', async (c) => {
  const user = c.get('user');
  const service = new UserService(c.env.DB);
  const prefs = await service.getPreferences(user.sub);
  return ok(c, prefs);
});

// PUT /me/preferences - 更新我的饮食偏好
userRoutes.put('/me/preferences', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ dietaryNotes?: string; allergenIds?: string[] }>();
  const service = new UserService(c.env.DB);
  await service.updatePreferences(user.sub, body);
  return ok(c, { message: '偏好已更新' });
});

// GET /preferences/all - 获取所有家人的饮食偏好
userRoutes.get('/preferences/all', async (c) => {
  const service = new UserService(c.env.DB);
  const result = await service.getAllPreferences();
  return ok(c, result);
});

// POST / - 创建用户（管理员）
userRoutes.post('/', adminMiddleware, async (c) => {
  const body = await c.req.json<{
    username?: string;
    email?: string;
    password?: string;
    displayName?: string;
    familyRole?: string;
  }>();

  if (!body.username || !body.email || !body.password || !body.displayName) {
    return error(c, 'INVALID_INPUT', '请填写所有必填字段', 400);
  }

  const service = new UserService(c.env.DB);
  const result = await service.createUser({
    username: body.username,
    email: body.email,
    password: body.password,
    displayName: body.displayName,
    familyRole: body.familyRole,
  });

  return ok(c, result, 201);
});

// PUT /me/password - 修改自己的密码
userRoutes.put('/me/password', async (c) => {
  const authUser = c.get('user');
  const body = await c.req.json<{ oldPassword?: string; newPassword?: string }>();

  if (!body.oldPassword || !body.newPassword) {
    return error(c, 'INVALID_INPUT', '请填写原密码和新密码', 400);
  }

  if (body.newPassword.length < 8) {
    return error(c, 'INVALID_INPUT', '新密码长度不能少于8个字符', 400);
  }

  const service = new UserService(c.env.DB);
  await service.changePassword(authUser.sub, body.oldPassword, body.newPassword);
  return ok(c, { message: '密码修改成功' });
});

// PUT /:userId - 更新用户信息
userRoutes.put('/:userId', async (c) => {
  const userId = c.req.param('userId')!;
  const authUser = c.get('user');

  // 只能修改自己的信息，管理员可以修改任何人的
  if (userId !== authUser.sub && !authUser.isAdmin) {
    return error(c, 'FORBIDDEN', '只能修改自己的信息', 403);
  }

  const body = await c.req.json<{ displayName?: string; familyRole?: string; avatarUrl?: string }>();
  const service = new UserService(c.env.DB);
  await service.updateUser(userId, body);
  return ok(c, { message: '更新成功' });
});

// PUT /:userId/approve - 审批用户（管理员）
userRoutes.put('/:userId/approve', adminMiddleware, async (c) => {
  const userId = c.req.param('userId')!;
  const body = await c.req.json<{ action?: 'approve' | 'reject' }>();

  if (!body.action || !['approve', 'reject'].includes(body.action)) {
    return error(c, 'INVALID_INPUT', '请指定操作：approve 或 reject', 400);
  }

  const service = new UserService(c.env.DB);
  const result = await service.approveUser(userId, body.action);
  return ok(c, result);
});

// PUT /:userId/reset-password - 重置密码（管理员）
userRoutes.put('/:userId/reset-password', adminMiddleware, async (c) => {
  const userId = c.req.param('userId')!;
  const body = await c.req.json<{ newPassword?: string }>();

  if (!body.newPassword || body.newPassword.length < 8) {
    return error(c, 'INVALID_INPUT', '新密码长度不能少于8个字符', 400);
  }

  const service = new UserService(c.env.DB);
  await service.resetPassword(userId, body.newPassword);
  return ok(c, { message: '密码已重置' });
});
