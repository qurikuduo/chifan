import { Context } from 'hono';

// 统一成功响应
export function ok<T>(c: Context, data: T, status: 200 | 201 = 200) {
  return c.json(data, status);
}

// 统一错误响应
export function error(c: Context, code: string, message: string, status: 400 | 401 | 403 | 404 | 409 | 410 | 422 | 500 = 400) {
  return c.json({ error: { code, message } }, status);
}

// 分页辅助
export function parsePagination(c: Context): { page: number; pageSize: number; offset: number } {
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') || '20', 10)));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function paginatedResponse<T>(data: T[], total: number, page: number, pageSize: number) {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
