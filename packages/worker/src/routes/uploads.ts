import { Hono } from 'hono';
import type { Env } from '../env.js';
import type { AppVariables } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { ok, error } from '../utils/response.js';

export const uploadRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();
uploadRoutes.use('/*', authMiddleware);

// POST /image - 上传图片（通用，用于菜肴描述中的图文混排）
uploadRoutes.post('/image', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return error(c, 'INVALID_INPUT', '请选择图片文件', 400);

  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) return error(c, 'INVALID_INPUT', '图片大小不能超过5MB', 400);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  if (!ALLOWED_TYPES.includes(file.type)) return error(c, 'INVALID_INPUT', '只支持 JPG/PNG/WebP 格式', 400);

  // Validate file content via magic bytes
  const headerBuf = await file.slice(0, 12).arrayBuffer();
  const header = new Uint8Array(headerBuf);
  const isJpeg = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
  const isWebp = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46
    && header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
  if (!isJpeg && !isPng && !isWebp) {
    return error(c, 'INVALID_INPUT', '文件内容与图片格式不符', 400);
  }

  const imageId = crypto.randomUUID().replace(/-/g, '');
  const key = `uploads/${imageId}`;

  await c.env.PHOTOS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const url = `/api/v1/photos/${key}`;
  return ok(c, { url }, 201);
});
