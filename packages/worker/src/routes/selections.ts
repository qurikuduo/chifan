import { Hono } from 'hono';
import type { Env } from '../env.js';

export const selectionRoutes = new Hono<{ Bindings: Env }>();

// 选菜路由已合并到 menus 路由中（/menus/:menuId/selections/*）
