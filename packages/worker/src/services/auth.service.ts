import type { Env, D1Database } from '../env.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken, type AuthUser } from '../middleware/auth.js';
import type { RegisterInput, LoginInput, LoginResponse, CreateUserInput } from '@family-menu/shared';

export class AuthService {
  constructor(private db: D1Database, private jwtSecret: string) {}

  async register(input: RegisterInput): Promise<void> {
    // 检查用户名是否已存在
    const existingUser = await this.db
      .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .bind(input.username, input.email)
      .first();

    if (existingUser) {
      throw new ServiceError('DUPLICATE', '用户名或邮箱已被注册', 409);
    }

    const passwordHash = await hashPassword(input.password);
    const id = crypto.randomUUID().replace(/-/g, '');

    await this.db
      .prepare(
        `INSERT INTO users (id, username, email, password_hash, display_name, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`
      )
      .bind(id, input.username, input.email, passwordHash, input.displayName)
      .run();
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    // 支持用户名或邮箱登录
    const user = await this.db
      .prepare(
        `SELECT id, username, email, password_hash, display_name, family_role, is_admin, status, avatar_url
         FROM users WHERE username = ? OR email = ?`
      )
      .bind(input.login, input.login)
      .first<{
        id: string;
        username: string;
        email: string;
        password_hash: string;
        display_name: string;
        family_role: string | null;
        is_admin: number;
        status: string;
        avatar_url: string | null;
      }>();

    if (!user) {
      throw new ServiceError('UNAUTHORIZED', '用户名或密码错误', 401);
    }

    if (user.status !== 'approved') {
      throw new ServiceError('FORBIDDEN', '账号尚未通过审批', 403);
    }

    const valid = await verifyPassword(input.password, user.password_hash);
    if (!valid) {
      throw new ServiceError('UNAUTHORIZED', '用户名或密码错误', 401);
    }

    const tokenPayload: AuthUser = {
      sub: user.id,
      username: user.username,
      isAdmin: user.is_admin === 1,
    };

    const token = await signToken(tokenPayload, this.jwtSecret);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        familyRole: user.family_role,
        isAdmin: user.is_admin === 1,
        avatarUrl: user.avatar_url,
      },
    };
  }

  async getUser(userId: string) {
    const user = await this.db
      .prepare(
        `SELECT id, username, email, display_name, family_role, is_admin, status, avatar_url, created_at, updated_at
         FROM users WHERE id = ?`
      )
      .bind(userId)
      .first<{
        id: string;
        username: string;
        email: string;
        display_name: string;
        family_role: string | null;
        is_admin: number;
        status: string;
        avatar_url: string | null;
        created_at: string;
        updated_at: string;
      }>();

    if (!user) {
      throw new ServiceError('NOT_FOUND', '用户不存在', 404);
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      familyRole: user.family_role,
      isAdmin: user.is_admin === 1,
      status: user.status,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}

export class UserService {
  constructor(private db: D1Database) {}

  async listUsers(status?: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    let query = 'SELECT id, username, email, display_name, family_role, is_admin, status, avatar_url, created_at FROM users';
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    const params: string[] = [];

    if (status) {
      query += ' WHERE status = ?';
      countQuery += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const countStmt = status
      ? this.db.prepare(countQuery).bind(status)
      : this.db.prepare(countQuery);

    const dataStmt = status
      ? this.db.prepare(query).bind(status, pageSize, offset)
      : this.db.prepare(query).bind(pageSize, offset);

    const [countResult, dataResult] = await Promise.all([
      countStmt.first<{ total: number }>(),
      dataStmt.all<{
        id: string;
        username: string;
        email: string;
        display_name: string;
        family_role: string | null;
        is_admin: number;
        status: string;
        avatar_url: string | null;
        created_at: string;
      }>(),
    ]);

    const total = countResult?.total ?? 0;
    const data = (dataResult.results ?? []).map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      displayName: u.display_name,
      familyRole: u.family_role,
      isAdmin: u.is_admin === 1,
      status: u.status,
      avatarUrl: u.avatar_url,
      createdAt: u.created_at,
    }));

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

  async approveUser(userId: string, action: 'approve' | 'reject') {
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const result = await this.db
      .prepare(`UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ? AND status = 'pending'`)
      .bind(newStatus, userId)
      .run();

    if (!result.meta.changes) {
      throw new ServiceError('NOT_FOUND', '用户不存在或状态不是待审批', 404);
    }

    return { message: action === 'approve' ? '已通过审批' : '已拒绝' };
  }

  async createUser(input: CreateUserInput): Promise<{ id: string }> {
    const existing = await this.db
      .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .bind(input.username, input.email)
      .first();

    if (existing) {
      throw new ServiceError('DUPLICATE', '用户名或邮箱已被注册', 409);
    }

    const passwordHash = await hashPassword(input.password);
    const id = crypto.randomUUID().replace(/-/g, '');

    await this.db
      .prepare(
        `INSERT INTO users (id, username, email, password_hash, display_name, family_role, is_admin, status)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'approved')`
      )
      .bind(id, input.username, input.email, passwordHash, input.displayName, input.familyRole ?? null)
      .run();

    return { id };
  }

  async updateUser(userId: string, data: { displayName?: string; familyRole?: string; avatarUrl?: string }) {
    const sets: string[] = [];
    const params: (string | null)[] = [];

    if (data.displayName !== undefined) {
      sets.push('display_name = ?');
      params.push(data.displayName);
    }
    if (data.familyRole !== undefined) {
      sets.push('family_role = ?');
      params.push(data.familyRole);
    }
    if (data.avatarUrl !== undefined) {
      sets.push('avatar_url = ?');
      params.push(data.avatarUrl);
    }

    if (sets.length === 0) {
      throw new ServiceError('INVALID_INPUT', '没有提供更新字段', 400);
    }

    sets.push("updated_at = datetime('now')");
    params.push(userId);

    await this.db
      .prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run();
  }

  async resetPassword(userId: string, newPassword: string) {
    const passwordHash = await hashPassword(newPassword);
    await this.db
      .prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(passwordHash, userId)
      .run();
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.db
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(userId)
      .first<{ password_hash: string }>();

    if (!user) {
      throw new ServiceError('NOT_FOUND', '用户不存在', 404);
    }

    const valid = await verifyPassword(oldPassword, user.password_hash);
    if (!valid) {
      throw new ServiceError('UNAUTHORIZED', '原密码错误', 401);
    }

    const passwordHash = await hashPassword(newPassword);
    await this.db
      .prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(passwordHash, userId)
      .run();
  }

  async getFamilyMembers() {
    const result = await this.db
      .prepare(
        `SELECT id, display_name, family_role, avatar_url FROM users WHERE status = 'approved' ORDER BY created_at`
      )
      .all<{ id: string; display_name: string; family_role: string | null; avatar_url: string | null }>();

    return (result.results ?? []).map((u) => ({
      id: u.id,
      displayName: u.display_name,
      familyRole: u.family_role,
      avatarUrl: u.avatar_url,
    }));
  }

  async getPreferences(userId: string) {
    const pref = await this.db
      .prepare('SELECT dietary_notes FROM user_preferences WHERE user_id = ?')
      .bind(userId)
      .first<{ dietary_notes: string | null }>();

    const allergens = await this.db
      .prepare(
        `SELECT i.id, i.name FROM user_allergens ua
         JOIN ingredients i ON ua.ingredient_id = i.id
         WHERE ua.user_id = ?
         ORDER BY i.name`
      )
      .bind(userId)
      .all<{ id: string; name: string }>();

    return {
      dietaryNotes: pref?.dietary_notes ?? '',
      allergens: allergens.results ?? [],
    };
  }

  async updatePreferences(userId: string, data: { dietaryNotes?: string; allergenIds?: string[] }) {
    // Upsert dietary notes
    if (data.dietaryNotes !== undefined) {
      await this.db
        .prepare(
          `INSERT INTO user_preferences (user_id, dietary_notes, updated_at)
           VALUES (?, ?, datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET dietary_notes = excluded.dietary_notes, updated_at = datetime('now')`
        )
        .bind(userId, data.dietaryNotes || null)
        .run();
    }

    // Sync allergen ingredients
    if (data.allergenIds !== undefined) {
      await this.db.prepare('DELETE FROM user_allergens WHERE user_id = ?').bind(userId).run();
      for (const ingredientId of data.allergenIds) {
        await this.db
          .prepare('INSERT OR IGNORE INTO user_allergens (user_id, ingredient_id) VALUES (?, ?)')
          .bind(userId, ingredientId)
          .run();
      }
    }
  }

  async getAllPreferences() {
    const users = await this.db
      .prepare(
        `SELECT u.id, u.display_name, up.dietary_notes
         FROM users u
         LEFT JOIN user_preferences up ON u.id = up.user_id
         WHERE u.status = 'approved'
         ORDER BY u.created_at`
      )
      .all<{ id: string; display_name: string; dietary_notes: string | null }>();

    const result = [];
    for (const u of users.results ?? []) {
      const allergens = await this.db
        .prepare(
          `SELECT i.id, i.name FROM user_allergens ua
           JOIN ingredients i ON ua.ingredient_id = i.id
           WHERE ua.user_id = ? ORDER BY i.name`
        )
        .bind(u.id)
        .all<{ id: string; name: string }>();

      result.push({
        userId: u.id,
        displayName: u.display_name,
        dietaryNotes: u.dietary_notes ?? '',
        allergens: allergens.results ?? [],
      });
    }
    return result;
  }
}

export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}
