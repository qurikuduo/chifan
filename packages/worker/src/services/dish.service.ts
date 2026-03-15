import { ServiceError } from './auth.service.js';
import type { D1Database, R2Bucket } from '../env.js';

export class DishService {
  constructor(private db: D1Database, private photos: R2Bucket) {}

  async list(query: { keyword?: string; tagId?: string; ingredientId?: string; cookingMethodId?: string; page: number; pageSize: number }) {
    const { keyword, tagId, ingredientId, cookingMethodId, page, pageSize } = query;
    const conditions: string[] = [];
    const params: string[] = [];

    if (keyword) {
      conditions.push('(d.name LIKE ? OR d.pinyin LIKE ? OR d.pinyin_initial LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (tagId) {
      conditions.push('d.id IN (SELECT dish_id FROM dish_tags WHERE tag_id = ?)');
      params.push(tagId);
    }
    if (ingredientId) {
      conditions.push('d.id IN (SELECT dish_id FROM dish_ingredients WHERE ingredient_id = ?)');
      params.push(ingredientId);
    }
    if (cookingMethodId) {
      conditions.push('d.id IN (SELECT dish_id FROM dish_cooking_methods WHERE cooking_method_id = ?)');
      params.push(cookingMethodId);
    }

    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const offset = (page - 1) * pageSize;

    const [countRes, dataRes] = await Promise.all([
      this.db.prepare(`SELECT COUNT(*) as total FROM dishes d${where}`).bind(...params).first<{ total: number }>(),
      this.db
        .prepare(`SELECT d.id, d.name, d.description, d.pinyin, d.default_photo_id, d.created_at FROM dishes d${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?`)
        .bind(...params, pageSize, offset)
        .all<{ id: string; name: string; description: string | null; pinyin: string | null; default_photo_id: string | null; created_at: string }>(),
    ]);

    const total = countRes?.total ?? 0;
    const dishes = dataRes.results ?? [];

    // Batch load relations for all dishes
    const ids = dishes.map((d) => d.id);
    type PhotoEntry = { id: string; url: string };
    type RefEntry = { id: string; name: string };
    const emptyPhotoMap = new Map<string, PhotoEntry[]>();
    const emptyRefMap = new Map<string, RefEntry[]>();

    const [photosMap, tagsMap, ingredientsMap, cookingMethodsMap] = ids.length
      ? await Promise.all([
          this.batchLoadPhotos(ids),
          this.batchLoadTags(ids),
          this.batchLoadIngredients(ids),
          this.batchLoadCookingMethods(ids),
        ])
      : [emptyPhotoMap, emptyRefMap, emptyRefMap, emptyRefMap];

    const data = dishes.map((d) => {
      const dPhotos = photosMap.get(d.id);
      const match = d.default_photo_id && dPhotos
        ? dPhotos.find((p) => p.id === d.default_photo_id)
        : undefined;
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        defaultPhoto: match ? { id: match.id, url: match.url } : null,
        tags: tagsMap.get(d.id) ?? [],
        ingredients: ingredientsMap.get(d.id) ?? [],
        cookingMethods: cookingMethodsMap.get(d.id) ?? [],
        selectionCount: 0,
        createdAt: d.created_at,
      };
    });

    return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async getById(dishId: string) {
    const d = await this.db
      .prepare(
        `SELECT d.*, u.id as user_id, u.display_name as user_display_name
         FROM dishes d JOIN users u ON d.created_by = u.id WHERE d.id = ?`
      )
      .bind(dishId)
      .first<{
        id: string; name: string; description: string | null;
        default_photo_id: string | null; created_by: string;
        created_at: string; updated_at: string;
        user_id: string; user_display_name: string;
      }>();

    if (!d) throw new ServiceError('NOT_FOUND', '菜品不存在', 404);

    const [photos, tags, ingredients, cookingMethods] = await Promise.all([
      this.db.prepare('SELECT id, dish_id, photo_url, file_size, mime_type, uploaded_by, created_at FROM dish_photos WHERE dish_id = ?').bind(dishId).all(),
      this.db.prepare('SELECT t.id, t.name FROM tags t JOIN dish_tags dt ON t.id = dt.tag_id WHERE dt.dish_id = ?').bind(dishId).all(),
      this.db.prepare('SELECT i.id, i.name FROM ingredients i JOIN dish_ingredients di ON i.id = di.ingredient_id WHERE di.dish_id = ?').bind(dishId).all(),
      this.db.prepare('SELECT cm.id, cm.name FROM cooking_methods cm JOIN dish_cooking_methods dcm ON cm.id = dcm.cooking_method_id WHERE dcm.dish_id = ?').bind(dishId).all(),
    ]);

    const photoList = (photos.results ?? []) as Array<{ id: string; dish_id: string; photo_url: string; file_size: number | null; mime_type: string | null; uploaded_by: string; created_at: string }>;

    return {
      id: d.id,
      name: d.name,
      description: d.description,
      defaultPhotoId: d.default_photo_id,
      createdBy: d.created_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      defaultPhoto: d.default_photo_id ? photoList.find((p) => p.id === d.default_photo_id) ?? null : null,
      photos: photoList.map((p) => ({ id: p.id, dishId: p.dish_id, url: p.photo_url, fileSize: p.file_size, mimeType: p.mime_type, uploadedBy: p.uploaded_by, createdAt: p.created_at })),
      tags: (tags.results ?? []) as Array<{ id: string; name: string }>,
      ingredients: (ingredients.results ?? []) as Array<{ id: string; name: string }>,
      cookingMethods: (cookingMethods.results ?? []) as Array<{ id: string; name: string }>,
      createdByUser: { id: d.user_id, displayName: d.user_display_name },
    };
  }

  async create(input: { name: string; description?: string; pinyin?: string; pinyinInitial?: string; ingredientIds?: string[]; cookingMethodIds?: string[]; tagIds?: string[] }, userId: string) {
    const id = crypto.randomUUID().replace(/-/g, '');

    await this.db
      .prepare(`INSERT INTO dishes (id, name, description, pinyin, pinyin_initial, created_by) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(id, input.name, input.description ?? null, input.pinyin ?? null, input.pinyinInitial ?? null, userId)
      .run();

    await this.syncRelations(id, input.ingredientIds, input.cookingMethodIds, input.tagIds);

    return { id };
  }

  async update(dishId: string, input: { name?: string; description?: string; pinyin?: string; pinyinInitial?: string; ingredientIds?: string[]; cookingMethodIds?: string[]; tagIds?: string[]; defaultPhotoId?: string }, userId: string) {
    const dish = await this.db.prepare('SELECT id, created_by FROM dishes WHERE id = ?').bind(dishId).first<{ id: string; created_by: string }>();
    if (!dish) throw new ServiceError('NOT_FOUND', '菜品不存在', 404);

    const sets: string[] = [];
    const params: (string | null)[] = [];

    if (input.name !== undefined) { sets.push('name = ?'); params.push(input.name); }
    if (input.description !== undefined) { sets.push('description = ?'); params.push(input.description); }
    if (input.pinyin !== undefined) { sets.push('pinyin = ?'); params.push(input.pinyin); }
    if (input.pinyinInitial !== undefined) { sets.push('pinyin_initial = ?'); params.push(input.pinyinInitial); }
    if (input.defaultPhotoId !== undefined) { sets.push('default_photo_id = ?'); params.push(input.defaultPhotoId); }

    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      params.push(dishId);
      await this.db.prepare(`UPDATE dishes SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
    }

    await this.syncRelations(dishId, input.ingredientIds, input.cookingMethodIds, input.tagIds);

    return { id: dishId };
  }

  async deleteDish(dishId: string) {
    // Delete photos from R2
    const photos = await this.db.prepare('SELECT id FROM dish_photos WHERE dish_id = ?').bind(dishId).all<{ id: string }>();
    for (const p of photos.results ?? []) {
      await this.photos.delete(`dishes/${dishId}/${p.id}`);
    }

    // Delete DB records (cascade via relations)
    await this.db.batch([
      this.db.prepare('DELETE FROM dish_photos WHERE dish_id = ?').bind(dishId),
      this.db.prepare('DELETE FROM dish_tags WHERE dish_id = ?').bind(dishId),
      this.db.prepare('DELETE FROM dish_ingredients WHERE dish_id = ?').bind(dishId),
      this.db.prepare('DELETE FROM dish_cooking_methods WHERE dish_id = ?').bind(dishId),
      this.db.prepare('DELETE FROM dishes WHERE id = ?').bind(dishId),
    ]);
  }

  async uploadPhoto(dishId: string, file: File, userId: string): Promise<{ id: string; url: string }> {
    const dish = await this.db.prepare('SELECT id FROM dishes WHERE id = ?').bind(dishId).first();
    if (!dish) throw new ServiceError('NOT_FOUND', '菜品不存在', 404);

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) throw new ServiceError('INVALID_INPUT', '图片大小不能超过5MB', 400);

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) throw new ServiceError('INVALID_INPUT', '只支持 JPG/PNG/WebP 格式', 400);

    // Validate file content via magic bytes
    const headerBuf = await file.slice(0, 12).arrayBuffer();
    const header = new Uint8Array(headerBuf);
    const isJpeg = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
    const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
    const isWebp = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46
      && header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
    if (!isJpeg && !isPng && !isWebp) {
      throw new ServiceError('INVALID_INPUT', '文件内容与图片格式不符', 400);
    }

    const photoId = crypto.randomUUID().replace(/-/g, '');
    const key = `dishes/${dishId}/${photoId}`;

    await this.photos.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const url = `/api/v1/photos/${key}`;

    await this.db
      .prepare('INSERT INTO dish_photos (id, dish_id, photo_url, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(photoId, dishId, url, file.size, file.type, userId)
      .run();

    // Auto set as default if first photo
    const count = await this.db.prepare('SELECT COUNT(*) as c FROM dish_photos WHERE dish_id = ?').bind(dishId).first<{ c: number }>();
    if (count && count.c === 1) {
      await this.db.prepare("UPDATE dishes SET default_photo_id = ?, updated_at = datetime('now') WHERE id = ?").bind(photoId, dishId).run();
    }

    return { id: photoId, url };
  }

  async setDefaultPhoto(dishId: string, photoId: string) {
    const photo = await this.db.prepare('SELECT id FROM dish_photos WHERE id = ? AND dish_id = ?').bind(photoId, dishId).first();
    if (!photo) throw new ServiceError('NOT_FOUND', '照片不存在', 404);

    await this.db.prepare("UPDATE dishes SET default_photo_id = ?, updated_at = datetime('now') WHERE id = ?").bind(photoId, dishId).run();
  }

  async deletePhoto(dishId: string, photoId: string) {
    const photo = await this.db.prepare('SELECT id FROM dish_photos WHERE id = ? AND dish_id = ?').bind(photoId, dishId).first();
    if (!photo) throw new ServiceError('NOT_FOUND', '照片不存在', 404);

    await this.photos.delete(`dishes/${dishId}/${photoId}`);
    await this.db.prepare('DELETE FROM dish_photos WHERE id = ?').bind(photoId).run();

    // If deleted photo was default, clear it
    const dish = await this.db.prepare('SELECT default_photo_id FROM dishes WHERE id = ?').bind(dishId).first<{ default_photo_id: string | null }>();
    if (dish?.default_photo_id === photoId) {
      await this.db.prepare("UPDATE dishes SET default_photo_id = NULL, updated_at = datetime('now') WHERE id = ?").bind(dishId).run();
    }
  }

  /** Lightweight search for menu creation: returns dishes with usage stats */
  async searchForMenu(keyword: string, limit = 20) {
    const conditions = ['(d.name LIKE ? OR d.pinyin LIKE ? OR d.pinyin_initial LIKE ?)'];
    const likeParam = `%${keyword}%`;
    const params: (string | number)[] = [likeParam, likeParam, likeParam, limit];

    const sql = `
      SELECT d.id, d.name, d.description, d.pinyin, d.default_photo_id,
             d.created_at,
             COUNT(DISTINCT ds.user_id || ds.menu_dish_id) as selection_count,
             MAX(md.created_at) as last_used_at
      FROM dishes d
      LEFT JOIN menu_dishes md ON md.dish_id = d.id
      LEFT JOIN dish_selections ds ON ds.menu_dish_id = md.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY d.id
      ORDER BY last_used_at DESC NULLS LAST, d.created_at DESC
      LIMIT ?
    `;

    const res = await this.db.prepare(sql).bind(...params).all<{
      id: string; name: string; description: string | null; pinyin: string | null;
      default_photo_id: string | null; created_at: string;
      selection_count: number; last_used_at: string | null;
    }>();

    const dishes = res.results ?? [];
    const ids = dishes.map((d) => d.id);
    const photosMap = ids.length ? await this.batchLoadPhotos(ids) : new Map<string, Array<{ id: string; url: string }>>();

    return dishes.map((d) => {
      const dPhotos = photosMap.get(d.id);
      const match = d.default_photo_id && dPhotos ? dPhotos.find((p) => p.id === d.default_photo_id) : undefined;
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        pinyin: d.pinyin,
        defaultPhoto: match ? { id: match.id, url: match.url } : null,
        selectionCount: d.selection_count,
        lastUsedAt: d.last_used_at,
        createdAt: d.created_at,
      };
    });
  }

  /** Clone a dish to create a variant */
  async clone(dishId: string, overrides: { name?: string; description?: string; pinyin?: string; pinyinInitial?: string }, userId: string) {
    const original = await this.getById(dishId);
    const newId = crypto.randomUUID().replace(/-/g, '');

    const name = overrides.name ?? original.name;
    const description = overrides.description ?? original.description;
    const pinyin = overrides.pinyin ?? null;
    const pinyinInitial = overrides.pinyinInitial ?? null;

    await this.db
      .prepare(`INSERT INTO dishes (id, name, description, pinyin, pinyin_initial, created_by) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(newId, name, description, pinyin, pinyinInitial, userId)
      .run();

    // Copy relations from original
    const ingredientIds = original.ingredients.map((i) => i.id);
    const cookingMethodIds = original.cookingMethods.map((m) => m.id);
    const tagIds = original.tags.map((t) => t.id);
    await this.syncRelations(newId, ingredientIds, cookingMethodIds, tagIds);

    return { id: newId };
  }

  /** Get favorite dishes per user (top N most selected) */
  async getFavorites(userId: string, limit = 10) {
    const sql = `
      SELECT d.id, d.name, d.description, d.default_photo_id,
             COUNT(*) as selection_count
      FROM dish_selections ds
      JOIN menu_dishes md ON md.id = ds.menu_dish_id
      JOIN dishes d ON d.id = md.dish_id
      WHERE ds.user_id = ?
      GROUP BY d.id
      ORDER BY selection_count DESC
      LIMIT ?
    `;
    const res = await this.db.prepare(sql).bind(userId, limit).all<{
      id: string; name: string; description: string | null;
      default_photo_id: string | null; selection_count: number;
    }>();

    const dishes = res.results ?? [];
    const ids = dishes.map((d) => d.id);
    const photosMap = ids.length ? await this.batchLoadPhotos(ids) : new Map<string, Array<{ id: string; url: string }>>();

    return dishes.map((d) => {
      const dPhotos = photosMap.get(d.id);
      const match = d.default_photo_id && dPhotos ? dPhotos.find((p) => p.id === d.default_photo_id) : undefined;
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        defaultPhoto: match ? { id: match.id, url: match.url } : null,
        selectionCount: d.selection_count,
      };
    });
  }

  /** Get all family members' favorite dishes */
  async getAllFavorites(limit = 5) {
    const sql = `
      SELECT ds.user_id, u.display_name,
             d.id as dish_id, d.name as dish_name,
             COUNT(*) as selection_count
      FROM dish_selections ds
      JOIN menu_dishes md ON md.id = ds.menu_dish_id
      JOIN dishes d ON d.id = md.dish_id
      JOIN users u ON u.id = ds.user_id
      GROUP BY ds.user_id, d.id
      ORDER BY ds.user_id, selection_count DESC
    `;
    const res = await this.db.prepare(sql).all<{
      user_id: string; display_name: string;
      dish_id: string; dish_name: string;
      selection_count: number;
    }>();

    const rows = res.results ?? [];
    const grouped = new Map<string, { userId: string; displayName: string; dishes: Array<{ id: string; name: string; count: number }> }>();

    for (const r of rows) {
      if (!grouped.has(r.user_id)) {
        grouped.set(r.user_id, { userId: r.user_id, displayName: r.display_name, dishes: [] });
      }
      const g = grouped.get(r.user_id)!;
      if (g.dishes.length < limit) {
        g.dishes.push({ id: r.dish_id, name: r.dish_name, count: r.selection_count });
      }
    }

    return Array.from(grouped.values());
  }

  // === private helpers ===

  private async syncRelations(dishId: string, ingredientIds?: string[], cookingMethodIds?: string[], tagIds?: string[]) {
    const stmts: D1PreparedStatement[] = [];

    if (ingredientIds !== undefined) {
      stmts.push(this.db.prepare('DELETE FROM dish_ingredients WHERE dish_id = ?').bind(dishId));
      for (const iid of ingredientIds) {
        stmts.push(this.db.prepare('INSERT INTO dish_ingredients (dish_id, ingredient_id) VALUES (?, ?)').bind(dishId, iid));
      }
    }

    if (cookingMethodIds !== undefined) {
      stmts.push(this.db.prepare('DELETE FROM dish_cooking_methods WHERE dish_id = ?').bind(dishId));
      for (const cid of cookingMethodIds) {
        stmts.push(this.db.prepare('INSERT INTO dish_cooking_methods (dish_id, cooking_method_id) VALUES (?, ?)').bind(dishId, cid));
      }
    }

    if (tagIds !== undefined) {
      stmts.push(this.db.prepare('DELETE FROM dish_tags WHERE dish_id = ?').bind(dishId));
      for (const tid of tagIds) {
        stmts.push(this.db.prepare('INSERT INTO dish_tags (dish_id, tag_id) VALUES (?, ?)').bind(dishId, tid));
      }
    }

    if (stmts.length > 0) await this.db.batch(stmts);
  }

  private async batchLoadPhotos(dishIds: string[]) {
    const placeholders = dishIds.map(() => '?').join(',');
    const res = await this.db
      .prepare(`SELECT id, dish_id, photo_url FROM dish_photos WHERE dish_id IN (${placeholders})`)
      .bind(...dishIds)
      .all<{ id: string; dish_id: string; photo_url: string }>();
    const map = new Map<string, Array<{ id: string; url: string }>>();
    for (const r of res.results ?? []) {
      if (!map.has(r.dish_id)) map.set(r.dish_id, []);
      map.get(r.dish_id)!.push({ id: r.id, url: r.photo_url });
    }
    return map;
  }

  private async batchLoadTags(dishIds: string[]) {
    const placeholders = dishIds.map(() => '?').join(',');
    const res = await this.db
      .prepare(`SELECT dt.dish_id, t.id, t.name FROM dish_tags dt JOIN tags t ON t.id = dt.tag_id WHERE dt.dish_id IN (${placeholders})`)
      .bind(...dishIds)
      .all<{ dish_id: string; id: string; name: string }>();
    return this.groupBy(res.results ?? [], 'dish_id');
  }

  private async batchLoadIngredients(dishIds: string[]) {
    const placeholders = dishIds.map(() => '?').join(',');
    const res = await this.db
      .prepare(`SELECT di.dish_id, i.id, i.name FROM dish_ingredients di JOIN ingredients i ON i.id = di.ingredient_id WHERE di.dish_id IN (${placeholders})`)
      .bind(...dishIds)
      .all<{ dish_id: string; id: string; name: string }>();
    return this.groupBy(res.results ?? [], 'dish_id');
  }

  private async batchLoadCookingMethods(dishIds: string[]) {
    const placeholders = dishIds.map(() => '?').join(',');
    const res = await this.db
      .prepare(`SELECT dcm.dish_id, cm.id, cm.name FROM dish_cooking_methods dcm JOIN cooking_methods cm ON cm.id = dcm.cooking_method_id WHERE dcm.dish_id IN (${placeholders})`)
      .bind(...dishIds)
      .all<{ dish_id: string; id: string; name: string }>();
    return this.groupBy(res.results ?? [], 'dish_id');
  }

  private groupBy<T extends Record<string, unknown>>(items: T[], key: string): Map<string, Array<{ id: string; name: string }>> {
    const map = new Map<string, Array<{ id: string; name: string }>>();
    for (const item of items) {
      const k = item[key] as string;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push({ id: item.id as string, name: item.name as string });
    }
    return map;
  }
}

// === Simple CRUD services for reference data ===

export class IngredientCategoryService {
  constructor(private db: D1Database) {}

  async list() {
    const res = await this.db.prepare('SELECT id, name, sort_order, created_at FROM ingredient_categories ORDER BY sort_order, name').all();
    return (res.results ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string, name: r.name as string, sortOrder: r.sort_order as number, createdAt: r.created_at as string,
    }));
  }

  async create(name: string, sortOrder = 0) {
    const id = crypto.randomUUID().replace(/-/g, '');
    await this.db.prepare('INSERT INTO ingredient_categories (id, name, sort_order) VALUES (?, ?, ?)').bind(id, name, sortOrder).run();
    return { id };
  }

  async update(id: string, data: { name?: string; sortOrder?: number }) {
    const sets: string[] = [];
    const params: (string | number)[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
    if (data.sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(data.sortOrder); }
    if (sets.length === 0) throw new ServiceError('INVALID_INPUT', '没有提供更新字段', 400);
    params.push(id);
    await this.db.prepare(`UPDATE ingredient_categories SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
  }

  async delete(id: string) {
    // Unlink ingredients first
    await this.db.prepare('UPDATE ingredients SET category_id = NULL WHERE category_id = ?').bind(id).run();
    await this.db.prepare('DELETE FROM ingredient_categories WHERE id = ?').bind(id).run();
  }
}

export class IngredientService {
  constructor(private db: D1Database) {}

  async search(keyword?: string, categoryId?: string) {
    let query = 'SELECT i.id, i.name, i.pinyin, i.pinyin_initial, i.category_id, ic.name as category_name FROM ingredients i LEFT JOIN ingredient_categories ic ON i.category_id = ic.id';
    const conditions: string[] = [];
    const params: string[] = [];

    if (keyword) {
      conditions.push('(i.name LIKE ? OR i.pinyin LIKE ? OR i.pinyin_initial LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (categoryId) {
      conditions.push('i.category_id = ?');
      params.push(categoryId);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY i.name LIMIT 100';

    const res = await this.db.prepare(query).bind(...params).all<{
      id: string; name: string; pinyin: string | null; pinyin_initial: string | null;
      category_id: string | null; category_name: string | null;
    }>();

    return (res.results ?? []).map((r) => ({
      id: r.id, name: r.name, pinyin: r.pinyin, pinyinInitial: r.pinyin_initial,
      categoryId: r.category_id, categoryName: r.category_name,
    }));
  }

  async grouped() {
    const cats = await this.db.prepare('SELECT id, name, sort_order FROM ingredient_categories ORDER BY sort_order, name').all<{ id: string; name: string; sort_order: number }>();
    const ingredients = await this.db.prepare('SELECT id, name, category_id FROM ingredients ORDER BY name').all<{ id: string; name: string; category_id: string | null }>();

    const groups = (cats.results ?? []).map((c) => ({
      categoryId: c.id,
      categoryName: c.name,
      ingredients: (ingredients.results ?? []).filter((i) => i.category_id === c.id).map((i) => ({ id: i.id, name: i.name })),
    }));

    // Uncategorized
    const uncategorized = (ingredients.results ?? []).filter((i) => !i.category_id);
    if (uncategorized.length) {
      groups.push({ categoryId: '', categoryName: '未分类', ingredients: uncategorized.map((i) => ({ id: i.id, name: i.name })) });
    }

    return groups;
  }

  async create(name: string, categoryId?: string) {
    const id = crypto.randomUUID().replace(/-/g, '');
    await this.db.prepare('INSERT INTO ingredients (id, name, category_id) VALUES (?, ?, ?)')
      .bind(id, name, categoryId ?? null).run();
    return { id };
  }

  async update(id: string, data: { name?: string; categoryId?: string }) {
    const sets: string[] = [];
    const params: (string | null)[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
    if (data.categoryId !== undefined) { sets.push('category_id = ?'); params.push(data.categoryId || null); }
    if (sets.length === 0) throw new ServiceError('INVALID_INPUT', '没有提供更新字段', 400);
    sets.push("updated_at = datetime('now')");
    params.push(id);
    await this.db.prepare(`UPDATE ingredients SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
  }

  async delete(id: string) {
    await this.db.prepare('DELETE FROM dish_ingredients WHERE ingredient_id = ?').bind(id).run();
    await this.db.prepare('DELETE FROM ingredients WHERE id = ?').bind(id).run();
  }
}

export class CookingMethodService {
  constructor(private db: D1Database) {}

  async list() {
    const res = await this.db.prepare('SELECT id, name, created_at FROM cooking_methods ORDER BY name').all();
    return res.results ?? [];
  }

  async create(name: string) {
    const id = crypto.randomUUID().replace(/-/g, '');
    await this.db.prepare('INSERT INTO cooking_methods (id, name) VALUES (?, ?)').bind(id, name).run();
    return { id };
  }

  async update(id: string, name: string) {
    await this.db.prepare('UPDATE cooking_methods SET name = ? WHERE id = ?').bind(name, id).run();
  }

  async delete(id: string) {
    await this.db.prepare('DELETE FROM dish_cooking_methods WHERE cooking_method_id = ?').bind(id).run();
    await this.db.prepare('DELETE FROM cooking_methods WHERE id = ?').bind(id).run();
  }
}

export class TagService {
  constructor(private db: D1Database) {}

  async list() {
    const res = await this.db.prepare('SELECT id, name, created_at FROM tags ORDER BY name').all();
    return res.results ?? [];
  }

  async create(name: string) {
    const id = crypto.randomUUID().replace(/-/g, '');
    await this.db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').bind(id, name).run();
    return { id };
  }

  async update(id: string, name: string) {
    await this.db.prepare('UPDATE tags SET name = ? WHERE id = ?').bind(name, id).run();
  }

  async delete(id: string) {
    await this.db.prepare('DELETE FROM dish_tags WHERE tag_id = ?').bind(id).run();
    await this.db.prepare('DELETE FROM tags WHERE id = ?').bind(id).run();
  }
}
