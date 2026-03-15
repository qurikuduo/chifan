import { ServiceError } from './auth.service.js';
import type { D1Database } from '../env.js';

// ==================== MenuService ====================

export class MenuService {
  constructor(private db: D1Database) {}

  // ---------- list ----------
  async listMenus(userId: string, opts: { status?: string; page?: number; pageSize?: number }) {
    const { status, page = 1, pageSize = 20 } = opts;
    const offset = (page - 1) * pageSize;
    const conditions: string[] = [];
    const params: unknown[] = [];

    // User can see menus they created, are invited to, or collaborate on
    conditions.push(`(
      m.created_by = ? OR
      EXISTS (SELECT 1 FROM menu_invitees mi WHERE mi.menu_id = m.id AND mi.user_id = ?) OR
      EXISTS (SELECT 1 FROM menu_creators mc WHERE mc.menu_id = m.id AND mc.user_id = ?)
    )`);
    params.push(userId, userId, userId);

    if (status) {
      conditions.push('m.status = ?');
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as total FROM menus m ${where}`)
      .bind(...params)
      .first<{ total: number }>();

    const rows = await this.db
      .prepare(`
        SELECT m.*,
          u.display_name as creator_display_name,
          u.family_role as creator_family_role,
          (SELECT COUNT(*) FROM menu_dishes md WHERE md.menu_id = m.id) as dish_count,
          (SELECT COUNT(*) FROM menu_invitees mi WHERE mi.menu_id = m.id) as total_invitees,
          (SELECT COUNT(*) FROM menu_invitees mi WHERE mi.menu_id = m.id AND mi.has_selected = 1) as completed_invitees
        FROM menus m
        LEFT JOIN users u ON u.id = m.created_by
        ${where}
        ORDER BY m.meal_time DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...params, pageSize, offset)
      .all();

    return {
      items: (rows.results ?? []).map((r: Record<string, unknown>) => ({
        id: r.id,
        title: r.title,
        mealType: r.meal_type,
        mealTime: r.meal_time,
        deadline: r.deadline,
        status: r.status,
        createdByUser: {
          id: r.created_by,
          displayName: r.creator_display_name ?? '',
          familyRole: r.creator_family_role ?? null,
        },
        dishCount: r.dish_count ?? 0,
        totalInvitees: r.total_invitees ?? 0,
        completedInvitees: r.completed_invitees ?? 0,
        createdAt: r.created_at,
      })),
      total: countResult?.total ?? 0,
      page,
      pageSize,
    };
  }

  // ---------- getById ----------
  async getById(menuId: string, userId: string) {
    const menu = await this.db
      .prepare('SELECT * FROM menus WHERE id = ?')
      .bind(menuId)
      .first<Record<string, unknown>>();
    if (!menu) throw new ServiceError('NOT_FOUND', '菜单不存在', 404);

    // Check access: creator, invitee, or collaborator
    const hasAccess =
      menu.created_by === userId ||
      (await this.db
        .prepare('SELECT 1 FROM menu_invitees WHERE menu_id = ? AND user_id = ?')
        .bind(menuId, userId)
        .first()) ||
      (await this.db
        .prepare('SELECT 1 FROM menu_creators WHERE menu_id = ? AND user_id = ?')
        .bind(menuId, userId)
        .first());

    if (!hasAccess) throw new ServiceError('FORBIDDEN', '无权访问该菜单', 403);

    // Load relations
    const [creatorsRows, inviteesRows, dishesRows, selectionsRows] = await Promise.all([
      this.db
        .prepare(
          `SELECT mc.user_id, mc.role, u.display_name, u.family_role
           FROM menu_creators mc JOIN users u ON u.id = mc.user_id
           WHERE mc.menu_id = ?`,
        )
        .bind(menuId)
        .all(),
      this.db
        .prepare(
          `SELECT mi.user_id, mi.has_selected, mi.selected_at, u.display_name, u.family_role
           FROM menu_invitees mi JOIN users u ON u.id = mi.user_id
           WHERE mi.menu_id = ?`,
        )
        .bind(menuId)
        .all(),
      this.db
        .prepare(
          `SELECT md.id as menu_dish_id, md.dish_id, md.photo_url, md.sort_order, md.added_by,
                  d.name, d.description,
                  u.display_name as added_by_name
           FROM menu_dishes md
           JOIN dishes d ON d.id = md.dish_id
           JOIN users u ON u.id = md.added_by
           WHERE md.menu_id = ?
           ORDER BY md.sort_order`,
        )
        .bind(menuId)
        .all(),
      this.db
        .prepare(
          `SELECT ds.menu_dish_id, ds.user_id, u.display_name, u.family_role
           FROM dish_selections ds
           JOIN users u ON u.id = ds.user_id
           WHERE ds.menu_id = ?`,
        )
        .bind(menuId)
        .all(),
    ]);

    // Group selections by menu_dish_id
    const selectionsMap = new Map<string, { userId: string; displayName: string; familyRole: string | null }[]>();
    for (const s of selectionsRows.results ?? []) {
      const r = s as Record<string, unknown>;
      const mdId = r.menu_dish_id as string;
      if (!selectionsMap.has(mdId)) selectionsMap.set(mdId, []);
      selectionsMap.get(mdId)!.push({
        userId: r.user_id as string,
        displayName: r.display_name as string,
        familyRole: r.family_role as string | null,
      });
    }

    const createdByUser = await this.db
      .prepare('SELECT id, display_name, family_role FROM users WHERE id = ?')
      .bind(menu.created_by)
      .first<Record<string, unknown>>();

    return {
      id: menu.id,
      title: menu.title,
      mealType: menu.meal_type,
      mealTime: menu.meal_time,
      deadline: menu.deadline,
      status: menu.status,
      createdBy: menu.created_by,
      createdAt: menu.created_at,
      updatedAt: menu.updated_at,
      createdByUser: createdByUser
        ? { id: createdByUser.id, displayName: createdByUser.display_name, familyRole: createdByUser.family_role }
        : { id: menu.created_by, displayName: '', familyRole: null },
      creators: (creatorsRows.results ?? []).map((r: Record<string, unknown>) => ({
        userId: r.user_id,
        displayName: r.display_name,
        familyRole: r.family_role,
        role: r.role,
      })),
      invitees: (inviteesRows.results ?? []).map((r: Record<string, unknown>) => ({
        userId: r.user_id,
        displayName: r.display_name,
        familyRole: r.family_role,
        hasSelected: !!r.has_selected,
        selectedAt: r.selected_at,
      })),
      dishes: (dishesRows.results ?? []).map((r: Record<string, unknown>) => {
        const mdId = r.menu_dish_id as string;
        const sels = selectionsMap.get(mdId) ?? [];
        return {
          menuDishId: mdId,
          dishId: r.dish_id,
          name: r.name,
          description: r.description,
          photoUrl: r.photo_url,
          sortOrder: r.sort_order,
          addedBy: { id: r.added_by, displayName: r.added_by_name },
          selections: sels,
          selectionCount: sels.length,
        };
      }),
    };
  }

  // ---------- create ----------
  async createMenu(
    userId: string,
    input: {
      title: string;
      mealType: string;
      mealTime: string;
      deadline: string;
      inviteeIds: string[];
      collaboratorIds?: string[];
      dishes?: { dishId: string; photoUrl?: string; sortOrder?: number }[];
    },
  ) {
    const menuId = crypto.randomUUID().replace(/-/g, '');

    await this.db
      .prepare(
        `INSERT INTO menus (id, title, meal_type, meal_time, deadline, status, created_by)
         VALUES (?, ?, ?, ?, ?, 'draft', ?)`,
      )
      .bind(menuId, input.title, input.mealType, input.mealTime, input.deadline, userId)
      .run();

    // Add creator as owner
    await this.db
      .prepare('INSERT INTO menu_creators (menu_id, user_id, role) VALUES (?, ?, ?)')
      .bind(menuId, userId, 'owner')
      .run();

    // Add collaborators
    if (input.collaboratorIds?.length) {
      const stmts = input.collaboratorIds.map((uid) =>
        this.db
          .prepare('INSERT INTO menu_creators (menu_id, user_id, role) VALUES (?, ?, ?)')
          .bind(menuId, uid, 'collaborator'),
      );
      await this.db.batch(stmts);
    }

    // Add invitees
    if (input.inviteeIds.length) {
      const stmts = input.inviteeIds.map((uid) =>
        this.db.prepare('INSERT INTO menu_invitees (menu_id, user_id) VALUES (?, ?)').bind(menuId, uid),
      );
      await this.db.batch(stmts);
    }

    // Add dishes
    if (input.dishes?.length) {
      const stmts = input.dishes.map((d, i) =>
        this.db
          .prepare(
            'INSERT INTO menu_dishes (id, menu_id, dish_id, photo_url, sort_order, added_by) VALUES (?, ?, ?, ?, ?, ?)',
          )
          .bind(
            crypto.randomUUID().replace(/-/g, ''),
            menuId,
            d.dishId,
            d.photoUrl ?? null,
            d.sortOrder ?? i,
            userId,
          ),
      );
      await this.db.batch(stmts);
    }

    return { id: menuId };
  }

  // ---------- update ----------
  async updateMenu(
    menuId: string,
    userId: string,
    input: { title?: string; mealType?: string; mealTime?: string; deadline?: string },
  ) {
    await this.ensureCreatorAccess(menuId, userId);
    const menu = await this.getMenuRow(menuId);
    if (menu.status !== 'draft') throw new ServiceError('INVALID_STATUS', '只能编辑草稿状态的菜单', 400);

    const sets: string[] = [];
    const params: unknown[] = [];
    if (input.title !== undefined) { sets.push('title = ?'); params.push(input.title); }
    if (input.mealType !== undefined) { sets.push('meal_type = ?'); params.push(input.mealType); }
    if (input.mealTime !== undefined) { sets.push('meal_time = ?'); params.push(input.mealTime); }
    if (input.deadline !== undefined) { sets.push('deadline = ?'); params.push(input.deadline); }

    if (sets.length === 0) return;

    sets.push("updated_at = datetime('now')");
    await this.db
      .prepare(`UPDATE menus SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...params, menuId)
      .run();
  }

  // ---------- delete ----------
  async deleteMenu(menuId: string, userId: string) {
    await this.ensureCreatorAccess(menuId, userId);
    const menu = await this.getMenuRow(menuId);
    if (menu.status !== 'draft') throw new ServiceError('INVALID_STATUS', '只能删除草稿状态的菜单', 400);
    await this.db.prepare('DELETE FROM menus WHERE id = ?').bind(menuId).run();
  }

  // ---------- addDish ----------
  async addDish(menuId: string, userId: string, input: { dishId: string; photoUrl?: string; sortOrder?: number }) {
    await this.ensureCreatorAccess(menuId, userId);

    // Check for duplicate
    const exists = await this.db
      .prepare('SELECT 1 FROM menu_dishes WHERE menu_id = ? AND dish_id = ?')
      .bind(menuId, input.dishId)
      .first();
    if (exists) throw new ServiceError('DUPLICATE', '该菜品已在菜单中', 409);

    const id = crypto.randomUUID().replace(/-/g, '');
    const maxSort = await this.db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM menu_dishes WHERE menu_id = ?')
      .bind(menuId)
      .first<{ max_sort: number }>();

    await this.db
      .prepare(
        'INSERT INTO menu_dishes (id, menu_id, dish_id, photo_url, sort_order, added_by) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .bind(id, menuId, input.dishId, input.photoUrl ?? null, input.sortOrder ?? (maxSort?.max_sort ?? 0) + 1, userId)
      .run();

    return { id };
  }

  // ---------- removeDish ----------
  async removeDish(menuId: string, menuDishId: string, userId: string) {
    await this.ensureCreatorAccess(menuId, userId);
    await this.db.prepare('DELETE FROM menu_dishes WHERE id = ? AND menu_id = ?').bind(menuDishId, menuId).run();
  }

  // ---------- reorderDishes ----------
  async reorderDishes(menuId: string, userId: string, order: { menuDishId: string; sortOrder: number }[]) {
    await this.ensureCreatorAccess(menuId, userId);
    const stmts = order.map((item) =>
      this.db
        .prepare('UPDATE menu_dishes SET sort_order = ? WHERE id = ? AND menu_id = ?')
        .bind(item.sortOrder, item.menuDishId, menuId),
    );
    await this.db.batch(stmts);
  }

  // ---------- updateInvitees ----------
  async updateInvitees(menuId: string, userId: string, inviteeIds: string[]) {
    await this.ensureCreatorAccess(menuId, userId);
    // Remove all then re-insert
    await this.db.prepare('DELETE FROM menu_invitees WHERE menu_id = ?').bind(menuId).run();
    if (inviteeIds.length) {
      const stmts = inviteeIds.map((uid) =>
        this.db.prepare('INSERT INTO menu_invitees (menu_id, user_id) VALUES (?, ?)').bind(menuId, uid),
      );
      await this.db.batch(stmts);
    }
  }

  // ---------- updateCollaborators ----------
  async updateCollaborators(menuId: string, userId: string, collaboratorIds: string[]) {
    await this.ensureOwnerAccess(menuId, userId);
    // Remove non-owner creators, then re-insert
    await this.db
      .prepare("DELETE FROM menu_creators WHERE menu_id = ? AND role = 'collaborator'")
      .bind(menuId)
      .run();
    if (collaboratorIds.length) {
      const stmts = collaboratorIds.map((uid) =>
        this.db
          .prepare('INSERT INTO menu_creators (menu_id, user_id, role) VALUES (?, ?, ?)')
          .bind(menuId, uid, 'collaborator'),
      );
      await this.db.batch(stmts);
    }
  }

  // ---------- status transitions ----------
  async publish(menuId: string, userId: string, db: D1Database) {
    await this.ensureCreatorAccess(menuId, userId);
    const menu = await this.getMenuRow(menuId);
    if (menu.status !== 'draft') throw new ServiceError('INVALID_STATUS', '只能发布草稿状态的菜单', 400);

    // Need at least 1 dish and 1 invitee
    const dishCount = await this.db
      .prepare('SELECT COUNT(*) as cnt FROM menu_dishes WHERE menu_id = ?')
      .bind(menuId)
      .first<{ cnt: number }>();
    if (!dishCount?.cnt) throw new ServiceError('VALIDATION', '至少需要添加一道菜品', 400);

    const inviteeCount = await this.db
      .prepare('SELECT COUNT(*) as cnt FROM menu_invitees WHERE menu_id = ?')
      .bind(menuId)
      .first<{ cnt: number }>();
    if (!inviteeCount?.cnt) throw new ServiceError('VALIDATION', '至少需要邀请一位家人', 400);

    await this.db
      .prepare("UPDATE menus SET status = 'published', updated_at = datetime('now') WHERE id = ?")
      .bind(menuId)
      .run();

    // Notify invitees
    const invitees = await this.db
      .prepare('SELECT user_id FROM menu_invitees WHERE menu_id = ?')
      .bind(menuId)
      .all();

    const notifService = new NotificationService(db);
    for (const row of invitees.results ?? []) {
      const r = row as Record<string, unknown>;
      await notifService.create(r.user_id as string, {
        type: 'menu_published',
        title: `新菜单「${menu.title}」已发布`,
        content: '快来选择你想吃的菜品吧！',
        relatedMenuId: menuId,
      });
    }
  }

  async closeSelection(menuId: string, userId: string) {
    await this.ensureCreatorAccess(menuId, userId);
    const menu = await this.getMenuRow(menuId);
    if (menu.status !== 'published') throw new ServiceError('INVALID_STATUS', '只能关闭选菜中的菜单', 400);

    await this.db
      .prepare("UPDATE menus SET status = 'selection_closed', updated_at = datetime('now') WHERE id = ?")
      .bind(menuId)
      .run();
  }

  async startCooking(menuId: string, userId: string) {
    await this.ensureCreatorAccess(menuId, userId);
    const menu = await this.getMenuRow(menuId);
    if (menu.status !== 'selection_closed')
      throw new ServiceError('INVALID_STATUS', '只能在选菜结束后开始烹饪', 400);

    await this.db
      .prepare("UPDATE menus SET status = 'cooking', updated_at = datetime('now') WHERE id = ?")
      .bind(menuId)
      .run();
  }

  async complete(menuId: string, userId: string, db: D1Database) {
    await this.ensureCreatorAccess(menuId, userId);
    const menu = await this.getMenuRow(menuId);
    if (menu.status !== 'cooking') throw new ServiceError('INVALID_STATUS', '只能在烹饪中完成菜单', 400);

    await this.db
      .prepare("UPDATE menus SET status = 'completed', updated_at = datetime('now') WHERE id = ?")
      .bind(menuId)
      .run();

    // Notify all invitees
    const invitees = await this.db
      .prepare('SELECT user_id FROM menu_invitees WHERE menu_id = ?')
      .bind(menuId)
      .all();

    const notifService = new NotificationService(db);
    for (const row of invitees.results ?? []) {
      const r = row as Record<string, unknown>;
      await notifService.create(r.user_id as string, {
        type: 'meal_ready',
        title: `「${menu.title}」已做好`,
        content: '饭做好了，快来吃吧！',
        relatedMenuId: menuId,
      });
    }
  }

  // ---------- selections ----------
  async getMySelections(menuId: string, userId: string) {
    const rows = await this.db
      .prepare('SELECT menu_dish_id FROM dish_selections WHERE menu_id = ? AND user_id = ?')
      .bind(menuId, userId)
      .all();
    return (rows.results ?? []).map((r: Record<string, unknown>) => r.menu_dish_id as string);
  }

  async submitSelections(menuId: string, userId: string, menuDishIds: string[]) {
    const menu = await this.getMenuRow(menuId);
    if (menu.status !== 'published') throw new ServiceError('INVALID_STATUS', '当前菜单不在选菜阶段', 400);

    // Check deadline
    if (new Date(menu.deadline as string) < new Date()) {
      throw new ServiceError('DEADLINE_PASSED', '选菜截止时间已过', 400);
    }

    // Check user is invitee
    const isInvitee = await this.db
      .prepare('SELECT 1 FROM menu_invitees WHERE menu_id = ? AND user_id = ?')
      .bind(menuId, userId)
      .first();
    if (!isInvitee) throw new ServiceError('FORBIDDEN', '你不在该菜单的邀请名单中', 403);

    // Delete existing and re-insert
    await this.db
      .prepare('DELETE FROM dish_selections WHERE menu_id = ? AND user_id = ?')
      .bind(menuId, userId)
      .run();

    if (menuDishIds.length) {
      const stmts = menuDishIds.map((mdId) =>
        this.db
          .prepare('INSERT INTO dish_selections (menu_id, menu_dish_id, user_id) VALUES (?, ?, ?)')
          .bind(menuId, mdId, userId),
      );
      await this.db.batch(stmts);
    }

    // Mark as selected
    await this.db
      .prepare("UPDATE menu_invitees SET has_selected = 1, selected_at = datetime('now') WHERE menu_id = ? AND user_id = ?")
      .bind(menuId, userId)
      .run();
  }

  async getSelectionSummary(menuId: string, userId: string) {
    // Check access
    await this.getById(menuId, userId);

    const dishes = await this.db
      .prepare(
        `SELECT md.id as menu_dish_id, d.name as dish_name, md.photo_url
         FROM menu_dishes md JOIN dishes d ON d.id = md.dish_id
         WHERE md.menu_id = ?
         ORDER BY md.sort_order`,
      )
      .bind(menuId)
      .all();

    const selections = await this.db
      .prepare(
        `SELECT ds.menu_dish_id, ds.user_id, u.display_name, u.family_role
         FROM dish_selections ds JOIN users u ON u.id = ds.user_id
         WHERE ds.menu_id = ?`,
      )
      .bind(menuId)
      .all();

    const selMap = new Map<string, { userId: string; displayName: string; familyRole: string | null }[]>();
    for (const s of selections.results ?? []) {
      const r = s as Record<string, unknown>;
      const mdId = r.menu_dish_id as string;
      if (!selMap.has(mdId)) selMap.set(mdId, []);
      selMap.get(mdId)!.push({
        userId: r.user_id as string,
        displayName: r.display_name as string,
        familyRole: r.family_role as string | null,
      });
    }

    const inviteeCounts = await this.db
      .prepare(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN has_selected = 1 THEN 1 ELSE 0 END) as completed
         FROM menu_invitees WHERE menu_id = ?`,
      )
      .bind(menuId)
      .first<{ total: number; completed: number }>();

    return {
      dishes: (dishes.results ?? []).map((r: Record<string, unknown>) => {
        const mdId = r.menu_dish_id as string;
        const selectedBy = selMap.get(mdId) ?? [];
        return {
          menuDishId: mdId,
          dishName: r.dish_name,
          photoUrl: r.photo_url,
          selectionCount: selectedBy.length,
          selectedBy,
        };
      }),
      totalInvitees: inviteeCounts?.total ?? 0,
      completedInvitees: inviteeCounts?.completed ?? 0,
    };
  }

  // ---------- print menu ----------
  async getPrintMenu(menuId: string, userId: string) {
    const menu = await this.getMenuRow(menuId);

    // Load dishes with ingredients and cooking methods
    const dishes = await this.db
      .prepare(
        `SELECT md.id as menu_dish_id, d.id as dish_id, d.name
         FROM menu_dishes md JOIN dishes d ON d.id = md.dish_id
         WHERE md.menu_id = ?
         ORDER BY md.sort_order`,
      )
      .bind(menuId)
      .all();

    const dishItems: { name: string; selectionCount: number; ingredients: string[]; cookingMethods: string[] }[] = [];

    for (const row of dishes.results ?? []) {
      const r = row as Record<string, unknown>;
      const dishId = r.dish_id as string;
      const mdId = r.menu_dish_id as string;

      const [selCount, ings, methods] = await Promise.all([
        this.db
          .prepare('SELECT COUNT(*) as cnt FROM dish_selections WHERE menu_dish_id = ?')
          .bind(mdId)
          .first<{ cnt: number }>(),
        this.db
          .prepare(
            `SELECT i.name FROM dish_ingredients di JOIN ingredients i ON i.id = di.ingredient_id WHERE di.dish_id = ?`,
          )
          .bind(dishId)
          .all(),
        this.db
          .prepare(
            `SELECT cm.name FROM dish_cooking_methods dcm JOIN cooking_methods cm ON cm.id = dcm.cooking_method_id WHERE dcm.dish_id = ?`,
          )
          .bind(dishId)
          .all(),
      ]);

      dishItems.push({
        name: r.name as string,
        selectionCount: selCount?.cnt ?? 0,
        ingredients: (ings.results ?? []).map((i: Record<string, unknown>) => i.name as string),
        cookingMethods: (methods.results ?? []).map((m: Record<string, unknown>) => m.name as string),
      });
    }

    const inviteeCount = await this.db
      .prepare('SELECT COUNT(*) as cnt FROM menu_invitees WHERE menu_id = ?')
      .bind(menuId)
      .first<{ cnt: number }>();

    return {
      title: menu.title,
      mealType: menu.meal_type,
      mealTime: menu.meal_time,
      dishes: dishItems,
      totalInvitees: inviteeCount?.cnt ?? 0,
    };
  }

  // ---------- helpers ----------
  private async getMenuRow(menuId: string) {
    const menu = await this.db.prepare('SELECT * FROM menus WHERE id = ?').bind(menuId).first<Record<string, unknown>>();
    if (!menu) throw new ServiceError('NOT_FOUND', '菜单不存在', 404);
    return menu;
  }

  private async ensureCreatorAccess(menuId: string, userId: string) {
    const creator = await this.db
      .prepare('SELECT 1 FROM menu_creators WHERE menu_id = ? AND user_id = ?')
      .bind(menuId, userId)
      .first();
    if (!creator) throw new ServiceError('FORBIDDEN', '只有菜单创建者或协作人才能操作', 403);
  }

  private async ensureOwnerAccess(menuId: string, userId: string) {
    const owner = await this.db
      .prepare("SELECT 1 FROM menu_creators WHERE menu_id = ? AND user_id = ? AND role = 'owner'")
      .bind(menuId, userId)
      .first();
    if (!owner) throw new ServiceError('FORBIDDEN', '只有菜单创建者才能操作', 403);
  }
}

// ==================== NotificationService ====================

export class NotificationService {
  constructor(private db: D1Database) {}

  async list(userId: string, opts: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = opts;
    const offset = (page - 1) * pageSize;

    const countResult = await this.db
      .prepare('SELECT COUNT(*) as total FROM notifications WHERE user_id = ?')
      .bind(userId)
      .first<{ total: number }>();

    const rows = await this.db
      .prepare(
        `SELECT * FROM notifications WHERE user_id = ?
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(userId, pageSize, offset)
      .all();

    return {
      items: (rows.results ?? []).map((r: Record<string, unknown>) => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,
        title: r.title,
        content: r.content,
        relatedMenuId: r.related_menu_id,
        isRead: !!r.is_read,
        createdAt: r.created_at,
      })),
      total: countResult?.total ?? 0,
      page,
      pageSize,
    };
  }

  async getUnreadCount(userId: string) {
    const result = await this.db
      .prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0')
      .bind(userId)
      .first<{ cnt: number }>();
    return result?.cnt ?? 0;
  }

  async markAsRead(notificationId: string, userId: string) {
    await this.db
      .prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
      .bind(notificationId, userId)
      .run();
  }

  async markAllAsRead(userId: string) {
    await this.db
      .prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0')
      .bind(userId)
      .run();
  }

  async create(
    userId: string,
    input: { type: string; title: string; content?: string; relatedMenuId?: string },
  ) {
    const id = crypto.randomUUID().replace(/-/g, '');
    await this.db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, content, related_menu_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, userId, input.type, input.title, input.content ?? null, input.relatedMenuId ?? null)
      .run();
    return { id };
  }
}
