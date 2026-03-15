import { Hono } from 'hono';
import type { Env } from '../env.js';
import type { AppVariables } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { MenuService } from '../services/menu.service.js';
import { ok, error } from '../utils/response.js';

export const menuRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

menuRoutes.use('/*', authMiddleware);

// GET / - 获取菜单列表
menuRoutes.get('/', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');
  const page = Number(c.req.query('page') ?? '1');
  const pageSize = Number(c.req.query('pageSize') ?? '20');
  const svc = new MenuService(c.env.DB);
  const result = await svc.listMenus(user.sub, { status, page, pageSize });
  return c.json(result);
});

// GET /:menuId - 获取菜单详情
menuRoutes.get('/:menuId', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const svc = new MenuService(c.env.DB);
  const detail = await svc.getById(menuId, user.sub);
  return c.json(detail);
});

// POST / - 创建菜单
menuRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    title: string;
    mealType: string;
    mealTime: string;
    deadline: string;
    inviteeIds: string[];
    collaboratorIds?: string[];
    dishes?: { dishId: string; photoUrl?: string; sortOrder?: number }[];
  }>();

  if (!body.title || !body.mealType || !body.mealTime || !body.deadline || !body.inviteeIds?.length) {
    return error(c, 'VALIDATION', '标题、餐次、用餐时间、截止时间和邀请人员为必填', 400);
  }

  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'afternoon_tea', 'late_night'];
  if (!validMealTypes.includes(body.mealType)) {
    return error(c, 'VALIDATION', '无效的餐次类型', 400);
  }

  if (body.title.length > 100) {
    return error(c, 'VALIDATION', '标题不能超过100个字符', 400);
  }

  if (isNaN(Date.parse(body.mealTime)) || isNaN(Date.parse(body.deadline))) {
    return error(c, 'VALIDATION', '无效的时间格式', 400);
  }

  const svc = new MenuService(c.env.DB);
  const result = await svc.createMenu(user.sub, body);
  return ok(c, result, 201);
});

// PUT /:menuId - 更新菜单
menuRoutes.put('/:menuId', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const body = await c.req.json<{ title?: string; mealType?: string; mealTime?: string; deadline?: string }>();
  const svc = new MenuService(c.env.DB);
  await svc.updateMenu(menuId, user.sub, body);
  return c.json({ success: true });
});

// DELETE /:menuId - 删除菜单
menuRoutes.delete('/:menuId', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const svc = new MenuService(c.env.DB);
  await svc.deleteMenu(menuId, user.sub);
  return c.body(null, 204);
});

// POST /:menuId/dishes - 添加菜品
menuRoutes.post('/:menuId/dishes', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const body = await c.req.json<{ dishId: string; photoUrl?: string; sortOrder?: number }>();
  if (!body.dishId) return error(c, 'VALIDATION', '菜品ID为必填', 400);
  const svc = new MenuService(c.env.DB);
  const result = await svc.addDish(menuId, user.sub, body);
  return c.json(result, 201);
});

// DELETE /:menuId/dishes/:menuDishId - 移除菜品
menuRoutes.delete('/:menuId/dishes/:menuDishId', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const menuDishId = c.req.param('menuDishId')!;
  const svc = new MenuService(c.env.DB);
  await svc.removeDish(menuId, menuDishId, user.sub);
  return c.body(null, 204);
});

// PUT /:menuId/dishes/reorder - 排序菜品
menuRoutes.put('/:menuId/dishes/reorder', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const body = await c.req.json<{ order: { menuDishId: string; sortOrder: number }[] }>();
  const svc = new MenuService(c.env.DB);
  await svc.reorderDishes(menuId, user.sub, body.order);
  return c.json({ success: true });
});

// PUT /:menuId/invitees - 更新邀请人员
menuRoutes.put('/:menuId/invitees', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const body = await c.req.json<{ inviteeIds: string[] }>();
  const svc = new MenuService(c.env.DB);
  await svc.updateInvitees(menuId, user.sub, body.inviteeIds);
  return c.json({ success: true });
});

// PUT /:menuId/collaborators - 更新协作厨师
menuRoutes.put('/:menuId/collaborators', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const body = await c.req.json<{ collaboratorIds: string[] }>();
  const svc = new MenuService(c.env.DB);
  await svc.updateCollaborators(menuId, user.sub, body.collaboratorIds);
  return c.json({ success: true });
});

// POST /:menuId/publish - 发布菜单
menuRoutes.post('/:menuId/publish', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const svc = new MenuService(c.env.DB);
  await svc.publish(menuId, user.sub, c.env.DB);
  return c.json({ success: true });
});

// POST /:menuId/close-selection - 关闭选菜
menuRoutes.post('/:menuId/close-selection', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const svc = new MenuService(c.env.DB);
  await svc.closeSelection(menuId, user.sub);
  return c.json({ success: true });
});

// POST /:menuId/start-cooking - 开始做菜
menuRoutes.post('/:menuId/start-cooking', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const svc = new MenuService(c.env.DB);
  await svc.startCooking(menuId, user.sub);
  return c.json({ success: true });
});

// POST /:menuId/complete - 饭做好了
menuRoutes.post('/:menuId/complete', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const svc = new MenuService(c.env.DB);
  await svc.complete(menuId, user.sub, c.env.DB);
  return c.json({ success: true });
});

// GET /:menuId/selections/me - 获取我的选择
menuRoutes.get('/:menuId/selections/me', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const svc = new MenuService(c.env.DB);
  const selections = await svc.getMySelections(menuId, user.sub);
  return c.json(selections);
});

// PUT /:menuId/selections - 提交选择
menuRoutes.put('/:menuId/selections', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const body = await c.req.json<{ menuDishIds: string[] }>();
  const svc = new MenuService(c.env.DB);
  await svc.submitSelections(menuId, user.sub, body.menuDishIds);
  return c.json({ success: true });
});

// GET /:menuId/selections/summary - 选菜汇总
menuRoutes.get('/:menuId/selections/summary', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const svc = new MenuService(c.env.DB);
  const summary = await svc.getSelectionSummary(menuId, user.sub);
  return c.json(summary);
});

// GET /:menuId/print - 打印菜单
menuRoutes.get('/:menuId/print', async (c) => {
  const user = c.get('user');
  const menuId = c.req.param('menuId')!;
  const svc = new MenuService(c.env.DB);
  const printData = await svc.getPrintMenu(menuId, user.sub);
  return c.json(printData);
});

// GET /:menuId/allergen-warnings - 过敏食材预警
menuRoutes.get('/:menuId/allergen-warnings', async (c) => {
  const menuId = c.req.param('menuId')!;
  const svc = new MenuService(c.env.DB);
  const warnings = await svc.getAllergenWarnings(menuId);
  return c.json(warnings);
});
