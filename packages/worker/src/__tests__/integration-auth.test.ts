/**
 * Integration tests for AuthService + UserService using real SQLite.
 * Tests actual SQL queries, constraints, and password hashing.
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createTestDb, seedUser } from './helpers/test-db.js';
import { AuthService, UserService, ServiceError } from '../services/auth.service.js';
import { SqliteD1Database } from '../adapters/sqlite.js';
import { hashPassword } from '../utils/password.js';

const JWT_SECRET = 'test-secret-key-for-integration-tests';

describe('AuthService (integration)', () => {
  let db: SqliteD1Database;
  let authService: AuthService;

  beforeEach(() => {
    db = createTestDb();
    authService = new AuthService(db as any, JWT_SECRET);
  });

  describe('register', () => {
    it('should create a pending user', async () => {
      await authService.register({
        username: 'mama',
        email: 'mama@family.com',
        password: 'test123',
        displayName: '妈妈',
      });

      const user = await db.prepare('SELECT * FROM users WHERE username = ?').bind('mama').first<any>();
      expect(user).not.toBeNull();
      expect(user!.status).toBe('pending');
      expect(user!.display_name).toBe('妈妈');
      expect(user!.password_hash).toBeTruthy();
      expect(user!.password_hash).not.toBe('test123'); // must be hashed
    });

    it('should reject duplicate username', async () => {
      await authService.register({
        username: 'mama',
        email: 'mama@family.com',
        password: 'test123',
        displayName: '妈妈',
      });

      await expect(
        authService.register({
          username: 'mama',
          email: 'mama2@family.com',
          password: 'test123',
          displayName: '妈妈2',
        }),
      ).rejects.toThrow(ServiceError);
    });

    it('should reject duplicate email', async () => {
      await authService.register({
        username: 'mama',
        email: 'mama@family.com',
        password: 'test123',
        displayName: '妈妈',
      });

      await expect(
        authService.register({
          username: 'papa',
          email: 'mama@family.com',
          password: 'test123',
          displayName: '爸爸',
        }),
      ).rejects.toThrow(ServiceError);
    });
  });

  describe('login', () => {
    it('should reject login for non-existent user', async () => {
      await expect(
        authService.login({ login: 'nobody', password: 'test' }),
      ).rejects.toThrow('用户名或密码错误');
    });

    it('should reject login for pending user', async () => {
      await authService.register({
        username: 'mama',
        email: 'mama@family.com',
        password: 'test123',
        displayName: '妈妈',
      });

      await expect(
        authService.login({ login: 'mama', password: 'test123' }),
      ).rejects.toThrow('尚未通过审批');
    });

    it('should reject wrong password', async () => {
      const hash = await hashPassword('correctpassword');
      await seedUser(db, {
        username: 'papa',
        email: 'papa@family.com',
        passwordHash: hash,
        displayName: '爸爸',
        status: 'approved',
      });

      await expect(
        authService.login({ login: 'papa', password: 'wrongpassword' }),
      ).rejects.toThrow('用户名或密码错误');
    });

    it('should return token and user on successful login', async () => {
      const hash = await hashPassword('mypassword');
      await seedUser(db, {
        username: 'mama',
        email: 'mama@family.com',
        passwordHash: hash,
        displayName: '妈妈',
        familyRole: '母亲',
        status: 'approved',
      });

      const result = await authService.login({ login: 'mama', password: 'mypassword' });
      expect(result.token).toBeTruthy();
      expect(result.user.username).toBe('mama');
      expect(result.user.displayName).toBe('妈妈');
      expect(result.user.familyRole).toBe('母亲');
    });

    it('should work with email login too', async () => {
      const hash = await hashPassword('mypassword');
      await seedUser(db, {
        username: 'mama',
        email: 'mama@family.com',
        passwordHash: hash,
        displayName: '妈妈',
        status: 'approved',
      });

      const result = await authService.login({ login: 'mama@family.com', password: 'mypassword' });
      expect(result.token).toBeTruthy();
      expect(result.user.email).toBe('mama@family.com');
    });
  });

  describe('getUser', () => {
    it('should return user by id', async () => {
      const id = await seedUser(db, { username: 'test', displayName: 'Test User' });
      const user = await authService.getUser(id);
      expect(user.username).toBe('test');
      expect(user.displayName).toBe('Test User');
    });

    it('should throw NOT_FOUND for non-existent user', async () => {
      await expect(authService.getUser('nonexistent')).rejects.toThrow('用户不存在');
    });
  });
});

describe('UserService (integration)', () => {
  let db: SqliteD1Database;
  let userService: UserService;

  beforeEach(() => {
    db = createTestDb();
    userService = new UserService(db as any);
  });

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      await seedUser(db, { username: 'user1', displayName: 'User 1' });
      await seedUser(db, { username: 'user2', displayName: 'User 2' });
      await seedUser(db, { username: 'user3', displayName: 'User 3', status: 'pending' });

      const result = await userService.listUsers();
      expect(result.pagination.total).toBe(3);
      expect(result.data.length).toBe(3);
    });

    it('should filter by status', async () => {
      await seedUser(db, { username: 'approved1', status: 'approved' });
      await seedUser(db, { username: 'pending1', status: 'pending' });

      const result = await userService.listUsers('pending');
      expect(result.pagination.total).toBe(1);
      expect(result.data[0].username).toBe('pending1');
    });

    it('should paginate correctly', async () => {
      for (let i = 0; i < 5; i++) {
        await seedUser(db, { username: `user${i}` });
      }

      const page1 = await userService.listUsers(undefined, 1, 2);
      expect(page1.data.length).toBe(2);
      expect(page1.pagination.total).toBe(5);

      const page2 = await userService.listUsers(undefined, 2, 2);
      expect(page2.data.length).toBe(2);
    });
  });

  describe('approveUser / reject', () => {
    it('should approve a pending user', async () => {
      const id = await seedUser(db, { username: 'pending', status: 'pending' });
      const result = await userService.approveUser(id, 'approve');
      expect(result.message).toBe('已通过审批');
    });

    it('should reject a pending user', async () => {
      const id = await seedUser(db, { username: 'pending', status: 'pending' });
      const result = await userService.approveUser(id, 'reject');
      expect(result.message).toBe('已拒绝');
    });

    it('should throw NOT_FOUND for non-existent user', async () => {
      await expect(userService.approveUser('nonexistent', 'approve')).rejects.toThrow(ServiceError);
    });
  });

  describe('createUser', () => {
    it('should create a user with approved status', async () => {
      const result = await userService.createUser({
        username: 'newuser',
        email: 'new@test.com',
        password: 'pass123',
        displayName: 'New User',
      });

      expect(result.id).toBeTruthy();

      // Verify in DB
      const row = await db.prepare('SELECT status FROM users WHERE id = ?').bind(result.id).first<any>();
      expect(row.status).toBe('approved');
    });

    it('should reject duplicate username', async () => {
      await seedUser(db, { username: 'taken' });

      await expect(
        userService.createUser({
          username: 'taken',
          email: 'new@test.com',
          password: 'pass123',
          displayName: 'Dup',
        }),
      ).rejects.toThrow(ServiceError);
    });
  });

  describe('updateUser', () => {
    it('should update display name and family role', async () => {
      const id = await seedUser(db, { username: 'test' });
      await userService.updateUser(id, {
        displayName: 'Updated Name',
        familyRole: '母亲',
      });

      // Verify in DB
      const row = await db.prepare('SELECT display_name, family_role FROM users WHERE id = ?').bind(id).first<any>();
      expect(row.display_name).toBe('Updated Name');
      expect(row.family_role).toBe('母亲');
    });
  });

  describe('resetPassword', () => {
    it('should reset password so new password works', async () => {
      const hash = await hashPassword('oldpass');
      const id = await seedUser(db, { username: 'test', passwordHash: hash });

      await userService.resetPassword(id, 'newpass');

      // Verify new password works via AuthService login
      await db.prepare("UPDATE users SET status = 'approved' WHERE id = ?").bind(id).run();
      const authService = new AuthService(db as any, JWT_SECRET);
      const result = await authService.login({ login: 'test', password: 'newpass' });
      expect(result.token).toBeTruthy();
    });
  });

  describe('changePassword', () => {
    it('should change password when old password is correct', async () => {
      const hash = await hashPassword('oldpass');
      const id = await seedUser(db, { username: 'test', passwordHash: hash });

      await userService.changePassword(id, 'oldpass', 'newpass');

      // Verify new password works
      await db.prepare("UPDATE users SET status = 'approved' WHERE id = ?").bind(id).run();
      const authService = new AuthService(db as any, JWT_SECRET);
      const result = await authService.login({ login: 'test', password: 'newpass' });
      expect(result.token).toBeTruthy();
    });

    it('should reject wrong old password', async () => {
      const hash = await hashPassword('correct');
      const id = await seedUser(db, { username: 'test', passwordHash: hash });

      await expect(
        userService.changePassword(id, 'wrong', 'newpass'),
      ).rejects.toThrow('原密码错误');
    });
  });

  describe('getFamilyMembers', () => {
    it('should only return approved users', async () => {
      await seedUser(db, { username: 'approved1', status: 'approved', familyRole: '父亲' });
      await seedUser(db, { username: 'approved2', status: 'approved', familyRole: '母亲' });
      await seedUser(db, { username: 'pending1', status: 'pending' });

      const members = await userService.getFamilyMembers();
      expect(members.length).toBe(2);
      expect(members.map((m: any) => m.familyRole).sort()).toEqual(['母亲', '父亲']);
    });
  });
});
