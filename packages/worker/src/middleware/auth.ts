import { Context, Next } from 'hono';
import { SignJWT, jwtVerify } from 'jose';
import type { Env } from '../env.js';

interface JwtPayload {
  sub: string;       // user id
  username: string;
  isAdmin: boolean;
}

// 导出给其他模块使用
export type AuthUser = JwtPayload;

// Hono Variables 类型
export interface AppVariables {
  user: AuthUser;
}

type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>;


// 生成 JWT
export async function signToken(payload: JwtPayload, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encoder.encode(secret));
  return token;
}

// 验证 JWT
export async function verifyToken(token: string, secret: string): Promise<JwtPayload> {
  const encoder = new TextEncoder();
  const { payload } = await jwtVerify(token, encoder.encode(secret));
  return payload as unknown as JwtPayload;
}

// 认证中间件
export async function authMiddleware(c: AppContext, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: '请先登录' } }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Token 无效或已过期' } }, 401);
  }
}

// 管理员权限中间件（需先经过 authMiddleware）
export async function adminMiddleware(c: AppContext, next: Next) {
  const user = c.get('user');
  if (!user?.isAdmin) {
    return c.json({ error: { code: 'FORBIDDEN', message: '需要管理员权限' } }, 403);
  }
  await next();
}
